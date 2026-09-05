package app.sasl.wavemesh;

import android.bluetooth.*;
import android.bluetooth.le.*;
import android.content.Context;
import android.os.Build;
import android.os.ParcelUuid;
import android.util.Log;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class WaveMeshNativeService {
    private static final String TAG = "WaveMeshNative";
    private static WaveMeshNativeService instance;
    
    public static final String SASL_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
    public static final String SASL_CHAR_IDENTITY_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
    public static final String SASL_CHAR_MESSAGE_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
    
    private Context context;
    private BluetoothManager bluetoothManager;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeScanner bleScanner;
    private BluetoothGattServer gattServer;
    private Map<String, BluetoothGatt> connectedGatts = new HashMap<>();
    
    private boolean bleReady = false;
    private boolean advertising = false;
    private boolean scanning = false;
    private String myUsername = "";
    
    public interface WaveMeshCallback {
        void onPeerDiscovered(String deviceId, String name, String connectionType, int distance);
        void onPeerConnected(String deviceId, String name);
        void onMessageReceived(String from, String text);
        void onICECandidate(String from, String candidate);
        void onStatusChanged(String status);
    }
    
    private WaveMeshCallback callback;
    
    public static synchronized WaveMeshNativeService getInstance(Context context) {
        if (instance == null) instance = new WaveMeshNativeService(context.getApplicationContext());
        return instance;
    }
    
    private WaveMeshNativeService(Context context) {
        this.context = context;
        initBLE();
    }
    
    // ============================================================
    // BLE INIT + GATT SERVER
    // ============================================================
    
    private void initBLE() {
        bluetoothManager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager == null) { Log.w(TAG, "BLE not available"); return; }
        bluetoothAdapter = bluetoothManager.getAdapter();
        if (bluetoothAdapter == null) { Log.w(TAG, "No Bluetooth adapter"); return; }
        bleScanner = bluetoothAdapter.getBluetoothLeScanner();
        
        gattServer = bluetoothManager.openGattServer(context, new BluetoothGattServerCallback() {
            @Override
            public void onConnectionStateChange(BluetoothDevice device, int status, int newState) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    Log.d(TAG, "GATT client connected: " + device.getAddress());
                    if (callback != null) callback.onPeerConnected(device.getAddress(), device.getName() != null ? device.getName() : "Sasl Peer");
                }
            }
            
            @Override
            public void onCharacteristicWriteRequest(BluetoothDevice device, int requestId,
                    BluetoothGattCharacteristic characteristic, boolean preparedWrite,
                    boolean responseNeeded, int offset, byte[] value) {
                String message = new String(value, StandardCharsets.UTF_8);
                Log.d(TAG, "Received: " + message);
                
                if (characteristic.getUuid().toString().equalsIgnoreCase(SASL_CHAR_MESSAGE_UUID)) {
                    if (callback != null) callback.onMessageReceived(device.getAddress(), message);
                              } else if (characteristic.getUuid().toString().equalsIgnoreCase(SASL_CHAR_IDENTITY_UUID)) {
                    // Check if it's a request or identity
                    try {
                        org.json.JSONObject json = new org.json.JSONObject(message);
                        String msgType = json.optString("type", "identity");
                        String from = json.optString("from", device.getName());
                        String msgText = json.optString("message", "");
                        
                        if ("request".equals(msgType)) {
                            // Send as peerConnected so the JS listener fires
                            if (callback != null) {
                                callback.onPeerConnected(device.getAddress(), from);
                                callback.onMessageReceived(from, msgText);
                            }
                        } else {
                            if (callback != null) callback.onPeerDiscovered(device.getAddress(), from, "ble", 10);
                        }
                    } catch (Exception e) {
                        if (callback != null) callback.onPeerDiscovered(device.getAddress(), message, "ble", 10);
                    }
                }
                
                if (responseNeeded) {
                    gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null);
                }
            }
        });
        
        BluetoothGattService saslService = new BluetoothGattService(
            UUID.fromString(SASL_SERVICE_UUID), BluetoothGattService.SERVICE_TYPE_PRIMARY);
        
        BluetoothGattCharacteristic idChar = new BluetoothGattCharacteristic(
            UUID.fromString(SASL_CHAR_IDENTITY_UUID),
            BluetoothGattCharacteristic.PROPERTY_READ | BluetoothGattCharacteristic.PROPERTY_WRITE,
            BluetoothGattCharacteristic.PERMISSION_READ | BluetoothGattCharacteristic.PERMISSION_WRITE);
        
        BluetoothGattCharacteristic msgChar = new BluetoothGattCharacteristic(
            UUID.fromString(SASL_CHAR_MESSAGE_UUID),
            BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_WRITE);
        
        saslService.addCharacteristic(idChar);
        saslService.addCharacteristic(msgChar);
        gattServer.addService(saslService);
        
        bleReady = true;
        Log.d(TAG, "BLE GATT server ready");
    }
    
    // ============================================================
    // BLE ADVERTISING
    // ============================================================
    
    public void startAdvertising(String username) {
        if (!bleReady || advertising) return;
        this.myUsername = username;
        String advName = username;
        if (advName.length() > 25) advName = advName.substring(0, 25);
        final String finalName = advName;
        
        try {
            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true).build();
            
            AdvertiseData data = new AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .addServiceUuid(new ParcelUuid(UUID.fromString(SASL_SERVICE_UUID))).build();
            
            bluetoothAdapter.setName(advName);
            bluetoothAdapter.getBluetoothLeAdvertiser().startAdvertising(settings, data, new AdvertiseCallback() {
                @Override
                public void onStartSuccess(AdvertiseSettings s) {
                    advertising = true;
                    Log.d(TAG, "Advertising as: " + finalName);
                    if (callback != null) callback.onStatusChanged("advertising_started");
                }
                @Override
                public void onStartFailure(int errorCode) {
                    Log.e(TAG, "Advertising failed: " + errorCode);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Advertising error: " + e.getMessage());
        }
    }
    
    public void stopAdvertising() {
        if (!advertising) return;
        try {
            bluetoothAdapter.getBluetoothLeAdvertiser().stopAdvertising(new AdvertiseCallback() {});
            advertising = false;
        } catch (Exception e) {}
    }
    
    // ============================================================
    // BLE SCAN
    // ============================================================
    
    public void startBLEScan() {
        if (!bleReady || scanning || bleScanner == null) return;
        scanning = true;
        
        ScanSettings settings = new ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings = new ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .setLegacy(false)
                .setPhy(ScanSettings.PHY_LE_ALL_SUPPORTED).build();
        }
        
               // Enable BLE 5 Long Range (Coded PHY)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                bluetoothAdapter.getClass().getMethod("setPreferredPhy", Integer.TYPE, Integer.TYPE, Integer.TYPE)
                    .invoke(bluetoothAdapter, 2, 2, 0);
            } catch (Exception e) {
                android.util.Log.d("WaveMesh", "BLE 5 PHY not supported: " + e.getMessage());
            }
        }
        
        bleScanner.startScan(null, settings, new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult result) {
                BluetoothDevice device = result.getDevice();
                String name = device.getName() != null ? device.getName() : "";
                if (name.isEmpty()) name = "Sasl Peer";
                int rssi = result.getRssi();
                int distance = calculateDistance(rssi);
                if (callback != null) callback.onPeerDiscovered(device.getAddress(), name, "ble", distance);
            }
            @Override
            public void onScanFailed(int errorCode) { scanning = false; }
        });
        Log.d(TAG, "BLE scan started");
    }
    
    public void stopBLEScan() {
        scanning = false;
        if (bleScanner != null) bleScanner.stopScan(new ScanCallback() {});
    }
    
    // ============================================================
    // BLE CONNECT
    // ============================================================
    
    public void connectToPeer(String deviceAddress) {
        if (!bleReady || bluetoothAdapter == null) return;
        BluetoothDevice device = bluetoothAdapter.getRemoteDevice(deviceAddress);
        if (device == null) return;
        
        BluetoothGatt gatt = device.connectGatt(context, false, new BluetoothGattCallback() {
            @Override
            public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    connectedGatts.put(deviceAddress, gatt);
                    gatt.discoverServices();
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        gatt.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH);
                    }
                    if (callback != null) callback.onPeerConnected(deviceAddress, device.getName() != null ? device.getName() : "Sasl Peer");
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    connectedGatts.remove(deviceAddress);
                    gatt.close();
                }
            }
            
            @Override
            public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    BluetoothGattService service = gatt.getService(UUID.fromString(SASL_SERVICE_UUID));
                    if (service != null) {
                        BluetoothGattCharacteristic msgChar = service.getCharacteristic(UUID.fromString(SASL_CHAR_MESSAGE_UUID));
                        if (msgChar != null) gatt.setCharacteristicNotification(msgChar, true);
                        
                        BluetoothGattCharacteristic idChar = service.getCharacteristic(UUID.fromString(SASL_CHAR_IDENTITY_UUID));
                        if (idChar != null && !myUsername.isEmpty()) {
                            String identity = "{\"type\":\"identity\",\"username\":\"" + myUsername + "\"}";
                            idChar.setValue(identity.getBytes());
                            gatt.writeCharacteristic(idChar);
                        }
                    }
                }
            }
            
            @Override
            public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
                String value = new String(characteristic.getValue());
                if (callback != null) callback.onMessageReceived(deviceAddress, value);
            }
        }, BluetoothDevice.TRANSPORT_LE);
    }
    
    public void sendMessage(String deviceAddress, String message) {
        BluetoothGatt gatt = connectedGatts.get(deviceAddress);
        if (gatt == null) return;
        try {
            BluetoothGattService service = gatt.getService(UUID.fromString(SASL_SERVICE_UUID));
            if (service != null) {
                BluetoothGattCharacteristic msgChar = service.getCharacteristic(UUID.fromString(SASL_CHAR_MESSAGE_UUID));
                if (msgChar != null) {
                    msgChar.setValue(message.getBytes());
                    gatt.writeCharacteristic(msgChar);
                }
            }
        } catch (Exception e) {}
    }
    
    // ============================================================
    // HELPERS
    // ============================================================
    
    private int calculateDistance(int rssi) {
        int txPower = -59;
        if (rssi == 0) return 100;
        double ratio = (txPower - rssi) / 20.0;
        return Math.min(2000, Math.max(1, (int) Math.round(Math.pow(10, ratio) * 100)));
    }
    
    public void setIdentity(String id, String username) { this.myUsername = username; }
    public void setCallback(WaveMeshCallback cb) { this.callback = cb; }
    public boolean isBleReady() { return bleReady; }
    public boolean isAdvertising() { return advertising; }
    public boolean isScanning() { return scanning; }
    
    public void stop() {
        stopAdvertising();
        stopBLEScan();
        for (BluetoothGatt gatt : connectedGatts.values()) gatt.close();
        connectedGatts.clear();
        if (gattServer != null) gattServer.close();
    }
}
