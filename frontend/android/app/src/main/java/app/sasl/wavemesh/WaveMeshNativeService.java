package app.sasl.wavemesh;

import android.bluetooth.*;
import android.bluetooth.le.*;
import android.content.Context;
import android.os.Build;
import android.os.ParcelUuid;
import android.util.Log;
import java.util.*;

public class WaveMeshNativeService {
    private static final String TAG = "WaveMeshNative";
    private static WaveMeshNativeService instance;
    
    public static final String SASL_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
    public static final String SASL_CHAR_MESSAGE_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
    public static final String SASL_CHAR_IDENTITY_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
    
    private Context context;
    private BluetoothManager bluetoothManager;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeScanner bleScanner;
    private BluetoothGattServer gattServer;
    private BluetoothGatt activeGatt;
    
    private boolean bleReady = false;
    private boolean advertising = false;
    private boolean scanning = false;
    private Map<String, BluetoothGatt> connectedGatts = new HashMap<>();
    private String myUsername = "";
    private String myNodeId = "";
    
    public interface WaveMeshCallback {
        void onPeerDiscovered(String deviceId, String name, String connectionType, int distance);
        void onPeerConnected(String deviceId, String name);
        void onMessageReceived(String from, String text);
        void onStatusChanged(String status);
    }
    
    private WaveMeshCallback callback;
    
    public static synchronized WaveMeshNativeService getInstance(Context context) {
        if (instance == null) {
            instance = new WaveMeshNativeService(context.getApplicationContext());
        }
        return instance;
    }
    
    private WaveMeshNativeService(Context context) {
        this.context = context;
        initBLE();
    }
    
    // ============================================================
    // BLE INIT + GATT SERVER (ADVERTISING)
    // ============================================================
    
    private void initBLE() {
        bluetoothManager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager == null) { Log.w(TAG, "BLE not available"); return; }
        
        bluetoothAdapter = bluetoothManager.getAdapter();
        if (bluetoothAdapter == null) { Log.w(TAG, "No Bluetooth adapter"); return; }
        
        bleScanner = bluetoothAdapter.getBluetoothLeScanner();
        
        // Open GATT server for BLE advertising
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
            gattServer = bluetoothManager.openGattServer(context, new BluetoothGattServerCallback() {
                @Override
                public void onConnectionStateChange(BluetoothDevice device, int status, int newState) {
                    if (newState == BluetoothProfile.STATE_CONNECTED) {
                        Log.d(TAG, "📱 GATT client connected: " + device.getAddress());
                        if (callback != null) {
                            callback.onPeerConnected(device.getAddress(), device.getName() != null ? device.getName() : "Sasl Peer");
                        }
                    }
                }
                
                @Override
                public void onCharacteristicWriteRequest(BluetoothDevice device, int requestId,
                        BluetoothGattCharacteristic characteristic, boolean preparedWrite,
                        boolean responseNeeded, int offset, byte[] value) {
                    String message = new String(value);
                    Log.d(TAG, "📩 Received: " + message);
                    
                    try {
                        if (characteristic.getUuid().toString().equalsIgnoreCase(SASL_CHAR_MESSAGE_UUID)) {
                            if (callback != null) callback.onMessageReceived(device.getAddress(), message);
                        } else if (characteristic.getUuid().toString().equalsIgnoreCase(SASL_CHAR_IDENTITY_UUID)) {
                            // Identity received — peer is connecting to us
                            String identityJson = message;
                            if (callback != null) {
                                callback.onPeerDiscovered(device.getAddress(), "Sasl Peer", "ble4", 10);
                            }
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Parse error", e);
                    }
                    
                    if (responseNeeded && Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
                        gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null);
                    }
                }
            });
            
            // Add Sasl WaveMesh GATT service
            BluetoothGattService saslService = new BluetoothGattService(
                UUID.fromString(SASL_SERVICE_UUID),
                BluetoothGattService.SERVICE_TYPE_PRIMARY
            );
            
            BluetoothGattCharacteristic idChar = new BluetoothGattCharacteristic(
                UUID.fromString(SASL_CHAR_IDENTITY_UUID),
                BluetoothGattCharacteristic.PROPERTY_READ | BluetoothGattCharacteristic.PROPERTY_WRITE,
                BluetoothGattCharacteristic.PERMISSION_READ | BluetoothGattCharacteristic.PERMISSION_WRITE
            );
            
            BluetoothGattCharacteristic msgChar = new BluetoothGattCharacteristic(
                UUID.fromString(SASL_CHAR_MESSAGE_UUID),
                BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                BluetoothGattCharacteristic.PERMISSION_WRITE
            );
            
            saslService.addCharacteristic(idChar);
            saslService.addCharacteristic(msgChar);
            gattServer.addService(saslService);
            
            bleReady = true;
            Log.d(TAG, "🔵 BLE GATT server ready");
        }
    }
    
    // ============================================================
    // BLE ADVERTISING
    // ============================================================
    
    public void startAdvertising(String username) {
        if (!bleReady || advertising) return;
        
        this.myUsername = username;
        String advName = username;
        if (advName.length() > 25) advName = advName.substring(0, 25);
        final String finalAdvName = username; // BLE name limit
        
        try {
            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true)
                .build();
            
            AdvertiseData data = new AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .addServiceUuid(new ParcelUuid(UUID.fromString(SASL_SERVICE_UUID)))
                .build();
            
            // Set device name to "Sasl_username"
            bluetoothAdapter.setName(advName);
            
            bluetoothAdapter.getBluetoothLeAdvertiser().startAdvertising(settings, data, new AdvertiseCallback() {
                @Override
                public void onStartSuccess(AdvertiseSettings settingsInEffect) {
                    advertising = true;
                    Log.d(TAG, "📡 Advertising as: " + finalAdvName);
                    if (callback != null) callback.onStatusChanged("advertising_started");
                }
                
                @Override
                public void onStartFailure(int errorCode) {
                    Log.e(TAG, "❌ Advertising failed: " + errorCode);
                    advertising = false;
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "❌ Advertising error: " + e.getMessage());
            advertising = false;
        }
    }
    
    public void stopAdvertising() {
        if (!advertising) return;
        try {
            bluetoothAdapter.getBluetoothLeAdvertiser().stopAdvertising(new AdvertiseCallback() {});
            advertising = false;
            Log.d(TAG, "⏹ Advertising stopped");
        } catch (Exception e) {
            Log.e(TAG, "Stop advertising error: " + e.getMessage());
        }
    }
    
    // ============================================================
    // BLE SCAN
    // ============================================================
    
    public void startBLEScan() {
        if (!bleReady || scanning || bleScanner == null) return;
        scanning = true;
        
        ScanSettings settings = new ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build();
        
        bleScanner.startScan(null, settings, new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult result) {
                BluetoothDevice device = result.getDevice();
                String name = device.getName() != null ? device.getName() : "";
                
                // Only show devices with names
                if (name.isEmpty()) return;
                
                int rssi = result.getRssi();
                int distance = calculateDistance(rssi);
                
                Log.d(TAG, "📡 Found: " + name + " at " + distance + "m");
                
                if (callback != null) {
                    callback.onPeerDiscovered(device.getAddress(), name, "ble4", distance);
                }
            }
            
            @Override
            public void onScanFailed(int errorCode) {
                Log.e(TAG, "Scan failed: " + errorCode);
                scanning = false;
            }
        });
        
        Log.d(TAG, "🔍 BLE scan started");
    }
    
    public void stopBLEScan() {
        scanning = false;
        if (bleScanner != null) {
            bleScanner.stopScan(new ScanCallback() {});
        }
    }
    
    // ============================================================
    // BLE CONNECT
    // ============================================================
    
    public void connectToPeer(String deviceAddress) {
        if (!bleReady || bluetoothAdapter == null) return;
        BluetoothDevice device = bluetoothAdapter.getRemoteDevice(deviceAddress);
        if (device == null) return;
        
        Log.d(TAG, "🔗 Connecting to: " + deviceAddress);
        
        BluetoothGatt gatt = device.connectGatt(context, false, new BluetoothGattCallback() {
            @Override
            public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    connectedGatts.put(deviceAddress, gatt);
                    gatt.discoverServices();
                    if (callback != null) callback.onPeerConnected(deviceAddress, device.getName() != null ? device.getName() : "Sasl Peer");
                    Log.d(TAG, "✅ Connected: " + deviceAddress);
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    connectedGatts.remove(deviceAddress);
                    gatt.close();
                    Log.d(TAG, "🔌 Disconnected: " + deviceAddress);
                }
            }
            
            @Override
            public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    // Enable notifications on message characteristic
                    BluetoothGattService service = gatt.getService(UUID.fromString(SASL_SERVICE_UUID));
                    if (service != null) {
                        BluetoothGattCharacteristic msgChar = service.getCharacteristic(UUID.fromString(SASL_CHAR_MESSAGE_UUID));
                        if (msgChar != null) {
                            gatt.setCharacteristicNotification(msgChar, true);
                            Log.d(TAG, "🔔 Notifications enabled");
                        }
                        
                        // Send identity to the other phone
                        BluetoothGattCharacteristic idChar = service.getCharacteristic(UUID.fromString(SASL_CHAR_IDENTITY_UUID));
                        if (idChar != null && myUsername != null && !myUsername.isEmpty()) {
                            String identity = "{\"type\":\"identity\",\"username\":\"" + myUsername + "\"}";
                            idChar.setValue(identity.getBytes());
                            gatt.writeCharacteristic(idChar);
                            Log.d(TAG, "📤 Identity sent: " + myUsername);
                        }
                    }
                }
            }
            
            @Override
            public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
                String value = new String(characteristic.getValue());
                Log.d(TAG, "📩 Notified: " + value);
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
                    Log.d(TAG, "📤 Sent: " + message.substring(0, Math.min(30, message.length())));
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Send error: " + e.getMessage());
        }
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
    
    public void setIdentity(String id, String username) {
        this.myNodeId = id;
        this.myUsername = username;
    }
    
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
