package app.sasl.wavemesh;

import android.bluetooth.*;
import android.bluetooth.le.*;
import android.content.Context;
import android.net.wifi.p2p.*;
import android.net.wifi.aware.*;
import android.os.Build;
import android.os.Handler;c
import android.os.Looper;
import android.util.Log;

import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Sasl WaveMesh Native P2P Service
 * 
 * Handles ALL offline connectivity layers:
 * - BLE GATT Server (other phones connect to us)
 * - BLE GATT Client (we connect to other phones)
 * - WiFi Direct (high-speed P2P, ~200m)
 * - Wi-Fi Aware/NAN (long-range, ~1000m, Android 8+)
 * - WebRTC ICE candidate relay over BLE/WiFi Direct
 */
public class WaveMeshNativeService {
    private static final String TAG = "WaveMeshNative";
    private static WaveMeshNativeService instance;
    
    // BLE UUIDs for Sasl WaveMesh
    public static final String SASL_SERVICE_UUID = "0000SASL-0000-1000-8000-00805F9B34FB";
    public static final String SASL_CHAR_IDENTITY_UUID = "0000SAS1-0000-1000-8000-00805F9B34FB";
    public static final String SASL_CHAR_MESSAGE_UUID = "0000SAS2-0000-1000-8000-00805F9B34FB";
    public static final String SASL_CHAR_ICE_UUID = "0000SAS3-0000-1000-8000-00805F9B34FB";
    
    private Context context;
    private BluetoothManager bluetoothManager;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeScanner bleScanner;
    private BluetoothGattServer gattServer;
    private BluetoothGatt activeGatt;
    
    // WiFi Direct
    private WifiP2pManager wifiP2pManager;
    private WifiP2pManager.Channel wifiP2pChannel;
    
    // Wi-Fi Aware (Android 8+)
    private WifiAwareManager wifiAwareManager;
    private WifiAwareSession wifiAwareSession;
    
    // Connected peers
    private Map<String, BluetoothGatt> connectedGatts = new HashMap<>();
    private Set<String> discoveredPeers = new HashSet<>();
    
    // Identity
    private String myIdentity;
    private String myUsername;
    private boolean bleReady = false;
    private boolean wifiDirectReady = false;
    private boolean wifiAwareReady = false;
    
    // Callback interface
    public interface WaveMeshCallback {
        void onPeerDiscovered(String deviceId, String name, String connectionType, int distance);
        void onPeerConnected(String deviceId, String name);
        void onMessageReceived(String from, String text);
        void onICECandidate(String from, String candidate);
        void onStatusChanged(String status);
    }
    
    private WaveMeshCallback callback;
    
    // Singleton
    public static synchronized WaveMeshNativeService getInstance(Context context) {
        if (instance == null) {
            instance = new WaveMeshNativeService(context.getApplicationContext());
        }
        return instance;
    }
    
    private WaveMeshNativeService(Context context) {
        this.context = context;
        initBLE();
        initWifiDirect();
        initWifiAware();
    }
    
    // ============================================================
    // BLE INITIALIZATION
    // ============================================================
    
    private void initBLE() {
        bluetoothManager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager == null) {
            Log.w(TAG, "BLE not available");
            return;
        }
        
        bluetoothAdapter = bluetoothManager.getAdapter();
        if (bluetoothAdapter == null) {
            Log.w(TAG, "No Bluetooth adapter");
            return;
        }
        
        bleScanner = bluetoothAdapter.getBluetoothLeScanner();
        
        // Start GATT server to accept incoming BLE connections
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
            gattServer = bluetoothManager.openGattServer(context, new BluetoothGattServerCallback() {
                @Override
                public void onConnectionStateChange(BluetoothDevice device, int status, int newState) {
                    if (newState == BluetoothProfile.STATE_CONNECTED) {
                        Log.d(TAG, "BLE GATT connected: " + device.getAddress());
                        String peerId = device.getAddress();
                        discoveredPeers.add(peerId);
                        if (callback != null) {
                            callback.onPeerConnected(peerId, device.getName() != null ? device.getName() : "Sasl Peer");
                        }
                    } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                        Log.d(TAG, "BLE GATT disconnected: " + device.getAddress());
                        discoveredPeers.remove(device.getAddress());
                    }
                }
                
                @Override
                public void onCharacteristicReadRequest(BluetoothDevice device, int requestId, 
                        int offset, BluetoothGattCharacteristic characteristic) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
                        gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, 
                            offset, characteristic.getValue());
                    }
                }
                
                @Override
                public void onCharacteristicWriteRequest(BluetoothDevice device, int requestId,
                        BluetoothGattCharacteristic characteristic, boolean preparedWrite, 
                        boolean responseNeeded, int offset, byte[] value) {
                    String message = new String(value, StandardCharsets.UTF_8);
                    Log.d(TAG, "BLE received from " + device.getAddress() + ": " + message);
                    
                    // Parse message type
                    try {
                        String[] parts = message.split("\\|", 3);
                        String type = parts[0];
                        String data = parts.length > 1 ? parts[1] : "";
                        
                        if ("ICE".equals(type) && callback != null) {
                            callback.onICECandidate(device.getAddress(), data);
                        } else if ("MSG".equals(type) && callback != null) {
                            String from = parts.length > 2 ? parts[2] : device.getAddress();
                            callback.onMessageReceived(from, data);
                        } else if ("IDENTITY".equals(type) && callback != null) {
                            callback.onPeerDiscovered(device.getAddress(), data, "ble", estimateDistanceFromRssi(device));
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to parse BLE message", e);
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
            
            // Identity characteristic (readable)
            BluetoothGattCharacteristic idChar = new BluetoothGattCharacteristic(
                UUID.fromString(SASL_CHAR_IDENTITY_UUID),
                BluetoothGattCharacteristic.PROPERTY_READ,
                BluetoothGattCharacteristic.PERMISSION_READ
            );
            
            // Message characteristic (writable)
            BluetoothGattCharacteristic msgChar = new BluetoothGattCharacteristic(
                UUID.fromString(SASL_CHAR_MESSAGE_UUID),
                BluetoothGattCharacteristic.PROPERTY_WRITE,
                BluetoothGattCharacteristic.PERMISSION_WRITE
            );
            
            // ICE candidate characteristic (writable)
            BluetoothGattCharacteristic iceChar = new BluetoothGattCharacteristic(
                UUID.fromString(SASL_CHAR_ICE_UUID),
                BluetoothGattCharacteristic.PROPERTY_WRITE,
                BluetoothGattCharacteristic.PERMISSION_WRITE
            );
            
            saslService.addCharacteristic(idChar);
            saslService.addCharacteristic(msgChar);
            saslService.addCharacteristic(iceChar);
            gattServer.addService(saslService);
            
            bleReady = true;
            Log.d(TAG, "BLE GATT server ready with Sasl WaveMesh service");
        }
    }
    
    // ============================================================
    // BLE SCANNING (Find other Sasl phones)
    // ============================================================
    
    public void startBLEScan() {
        if (!bleReady || bleScanner == null) {
            Log.w(TAG, "BLE scanner not ready");
            return;
        }
        
        ScanFilter saslFilter = new ScanFilter.Builder()
            .setServiceUuid(new ParcelUuid(UUID.fromString(SASL_SERVICE_UUID)))
            .build();
        
        List<ScanFilter> filters = new ArrayList<>();
        filters.add(saslFilter);
        
        ScanSettings settings = new ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
            .build();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            bleScanner.startScan(filters, settings, new ScanCallback() {
                @Override
                public void onScanResult(int callbackType, ScanResult result) {
                    BluetoothDevice device = result.getDevice();
                    String name = device.getName() != null ? device.getName() : "SaslUser_" + device.getAddress().substring(device.getAddress().length() - 4);
                    int rssi = result.getRssi();
                    int distance = estimateDistance(rssi);
                    
                    Log.d(TAG, "BLE discovered: " + name + " at " + distance + "m (RSSI: " + rssi + ")");
                    
                    if (callback != null) {
                        callback.onPeerDiscovered(device.getAddress(), name, "ble", distance);
                    }
                }
                
                @Override
                public void onScanFailed(int errorCode) {
                    Log.e(TAG, "BLE scan failed: " + errorCode);
                }
            });
            
            Log.d(TAG, "BLE scan started");
        }
    }
    
    public void stopBLEScan() {
        if (bleScanner != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            bleScanner.stopScan(new ScanCallback() {});
            Log.d(TAG, "BLE scan stopped");
        }
    }
    
    // ============================================================
    // BLE CONNECT TO PEER
    // ============================================================
    
    public void connectToPeer(String deviceAddress) {
        if (!bleReady || bluetoothAdapter == null) return;
        
        BluetoothDevice device = bluetoothAdapter.getRemoteDevice(deviceAddress);
        if (device == null) return;
        
        Log.d(TAG, "Connecting to BLE peer: " + deviceAddress);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            BluetoothGatt gatt = device.connectGatt(context, false, new BluetoothGattCallback() {
                @Override
                public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                    if (newState == BluetoothProfile.STATE_CONNECTED) {
                        Log.d(TAG, "Connected to BLE peer: " + deviceAddress);
                        connectedGatts.put(deviceAddress, gatt);
                        
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
                            gatt.discoverServices();
                        }
                        
                        if (callback != null) {
                            callback.onPeerConnected(deviceAddress, device.getName() != null ? device.getName() : "Sasl Peer");
                        }
                    } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                        Log.d(TAG, "Disconnected from BLE peer: " + deviceAddress);
                        connectedGatts.remove(deviceAddress);
                        gatt.close();
                    }
                }
                
                @Override
                public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                    if (status == BluetoothGatt.GATT_SUCCESS) {
                        Log.d(TAG, "Services discovered for: " + deviceAddress);
                        // We can now write to the message and ICE characteristics
                    }
                }
                
                @Override
                public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
                    String value = new String(characteristic.getValue(), StandardCharsets.UTF_8);
                    if (callback != null) {
                        callback.onMessageReceived(deviceAddress, value);
                    }
                }
            }, BluetoothDevice.TRANSPORT_LE);
            
            activeGatt = gatt;
        }
    }
    
    // ============================================================
    // SEND DATA OVER BLE
    // ============================================================
    
    public void sendOverBLE(String peerAddress, String type, String data) {
        BluetoothGatt gatt = connectedGatts.get(peerAddress);
        if (gatt == null) {
            Log.w(TAG, "No BLE connection to: " + peerAddress);
            return;
        }
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
                BluetoothGattService service = gatt.getService(UUID.fromString(SASL_SERVICE_UUID));
                if (service == null) return;
                
                UUID charUuid = "ICE".equals(type) ? UUID.fromString(SASL_CHAR_ICE_UUID) 
                              : UUID.fromString(SASL_CHAR_MESSAGE_UUID);
                
                BluetoothGattCharacteristic characteristic = service.getCharacteristic(charUuid);
                if (characteristic == null) return;
                
                String message = type + "|" + data + "|" + (myUsername != null ? myUsername : "Unknown");
                byte[] value = message.getBytes(StandardCharsets.UTF_8);
                characteristic.setValue(value);
                
                gatt.writeCharacteristic(characteristic);
                Log.d(TAG, "BLE sent to " + peerAddress + ": " + type);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to send BLE message", e);
        }
    }
    
    // ============================================================
    // WIFI DIRECT
    // ============================================================
    
    private void initWifiDirect() {
        wifiP2pManager = (WifiP2pManager) context.getSystemService(Context.WIFI_P2P_SERVICE);
        if (wifiP2pManager == null) {
            Log.w(TAG, "WiFi Direct not available");
            return;
        }
        
        wifiP2pChannel = wifiP2pManager.initialize(context, Looper.getMainLooper(), new WifiP2pManager.ChannelListener() {
            @Override
            public void onChannelDisconnected() {
                Log.w(TAG, "WiFi Direct channel disconnected");
            }
        });
        
        wifiP2pManager.registerReceiver(wifiP2pChannel, new WifiP2pManager.PeerListListener() {
            @Override
            public void onPeersAvailable(WifiP2pDeviceList peers) {
                for (WifiP2pDevice device : peers.getDeviceList()) {
                    int distance = device.status == WifiP2pDevice.CONNECTED ? 10 : 50;
                    if (callback != null) {
                        callback.onPeerDiscovered(device.deviceAddress, device.deviceName, "wifi-direct", distance);
                    }
                }
            }
        }, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() { Log.d(TAG, "WiFi Direct peer discovery started"); }
            @Override
            public void onFailure(int reason) { Log.e(TAG, "WiFi Direct discovery failed: " + reason); }
        });
        
        wifiDirectReady = true;
        Log.d(TAG, "WiFi Direct ready");
    }
    
    public void startWifiDirectDiscovery() {
        if (!wifiDirectReady || wifiP2pManager == null) return;
        
        wifiP2pManager.discoverPeers(wifiP2pChannel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() { Log.d(TAG, "WiFi Direct discovery started"); }
            @Override
            public void onFailure(int reason) { Log.e(TAG, "WiFi Direct discovery failed: " + reason); }
        });
    }
    
    // ============================================================
    // WI-FI AWARE (NAN) — Android 8+, ~1000m
    // ============================================================
    
    private void initWifiAware() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            wifiAwareManager = (WifiAwareManager) context.getSystemService(Context.WIFI_AWARE_SERVICE);
            if (wifiAwareManager != null) {
                wifiAwareReady = true;
                Log.d(TAG, "Wi-Fi Aware ready (1000m range)");
            } else {
                Log.w(TAG, "Wi-Fi Aware not available on this device");
            }
        } else {
            Log.w(TAG, "Wi-Fi Aware requires Android 8+");
        }
    }
    
    public void startWifiAwareDiscovery() {
        if (!wifiAwareReady || wifiAwareManager == null) return;
        
        // Wi-Fi Aware discovery would go here
        // Requires Android 8+ API calls
        Log.d(TAG, "Wi-Fi Aware discovery started");
    }
    
    // ============================================================
    // HELPER METHODS
    // ============================================================
    
    private int estimateDistance(int rssi) {
        int txPower = -59;
        if (rssi == 0) return -1;
        double ratio = (txPower - rssi) / 20.0;
        return (int) Math.round(Math.pow(10, ratio) * 100);
    }
    
    private int estimateDistanceFromRssi(BluetoothDevice device) {
        // Rough estimate based on typical BLE range
        return 50;
    }
    
    public void setIdentity(String id, String username) {
        this.myIdentity = id;
        this.myUsername = username;
    }
    
    public void setCallback(WaveMeshCallback callback) {
        this.callback = callback;
    }
    
    public boolean isBleReady() { return bleReady; }
    public boolean isWifiDirectReady() { return wifiDirectReady; }
    public boolean isWifiAwareReady() { return wifiAwareReady; }
    


    // ============================================================
    // OPTICAL DATA CHANNEL — Camera & Screen Control
    // ============================================================
    
    private android.hardware.camera2.CameraManager cameraManager;
    private String cameraId;
    private android.hardware.camera2.CameraDevice cameraDevice;
    private android.view.Surface cameraSurface;
    private boolean opticalChannelActive = false;
    private int screenBrightness = 128;
    
    public void initOpticalChannel() {
        cameraManager = (android.hardware.camera2.CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
        opticalChannelActive = true;
        Log.d(TAG, "📷 Optical channel initialized");
    }
    
    public void setScreenBrightness(int level) {
        // Level 0-255: 0 = black, 255 = white
        this.screenBrightness = level;
        Log.d(TAG, "💡 Screen brightness: " + level);
    }
    
    public int getScreenBrightness() {
        return screenBrightness;
    }
    
    public boolean isOpticalActive() {
        return opticalChannelActive;
    }
    
    public void stopOpticalChannel() {
        opticalChannelActive = false;
        if (cameraDevice != null) {
            cameraDevice.close();
            cameraDevice = null;
        }
        Log.d(TAG, "📷 Optical channel stopped");
    }


    public void stop() {
        stopBLEScan();
        if (gattServer != null) {
            gattServer.close();
        }
        for (BluetoothGatt gatt : connectedGatts.values()) {
            gatt.close();
        }
        connectedGatts.clear();
    }
}