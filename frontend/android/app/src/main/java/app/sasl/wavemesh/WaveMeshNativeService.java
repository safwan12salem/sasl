package app.sasl.wavemesh;

import android.bluetooth.*;
import android.bluetooth.le.*;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.wifi.p2p.*;
import android.net.wifi.aware.*;
import android.os.Build;
import android.os.Looper;
import android.os.ParcelUuid;
import android.util.Log;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class WaveMeshNativeService {
    private static final String TAG = "WaveMeshNative";
    private static WaveMeshNativeService instance;
    
    public static final String SASL_SERVICE_UUID = "0000SASL-0000-1000-8000-00805F9B34FB";
    public static final String SASL_CHAR_IDENTITY_UUID = "0000SAS1-0000-1000-8000-00805F9B34FB";
    public static final String SASL_CHAR_MESSAGE_UUID = "0000SAS2-0000-1000-8000-00805F9B34FB";
    public static final String SASL_CHAR_ICE_UUID = "0000SAS3-0000-1000-8000-00805F9B34FB";
    public static final int WIFI_DIRECT_PORT = 9876;
    
    private Context context;
    private BluetoothManager bluetoothManager;
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothLeScanner bleScanner;
    private BluetoothGattServer gattServer;
    
    private WifiP2pManager wifiP2pManager;
    private WifiP2pManager.Channel wifiP2pChannel;
    private BroadcastReceiver wifiDirectReceiver;
    private boolean wifiDirectReceiverRegistered = false;
    private ServerSocket wifiDirectServerSocket;
    private Map<String, Socket> wifiDirectSockets = new HashMap<>();
    private boolean wifiDirectServerRunning = false;
    
    private WifiAwareManager wifiAwareManager;
    
    private Map<String, BluetoothGatt> connectedGatts = new HashMap<>();
    
    private String myIdentity;
    private String myUsername;
    private boolean bleReady = false;
    private boolean wifiDirectReady = false;
    private boolean wifiAwareReady = false;
    
    public interface WaveMeshCallback {
        void onPeerDiscovered(String deviceId, String name, String connectionType, int distance);
        void onPeerConnected(String deviceId, String name);
        void onMessageReceived(String from, String text);
        void onICECandidate(String from, String candidate);
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
        initWifiDirect();
        initWifiAware();
    }
    
    // ============================================================
    // BLE INIT
    // ============================================================
    
    private void initBLE() {
        bluetoothManager = (BluetoothManager) context.getSystemService(Context.BLUETOOTH_SERVICE);
        if (bluetoothManager == null) { Log.w(TAG, "BLE not available"); return; }
        bluetoothAdapter = bluetoothManager.getAdapter();
        if (bluetoothAdapter == null) { Log.w(TAG, "No Bluetooth adapter"); return; }
        bleScanner = bluetoothAdapter.getBluetoothLeScanner();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
            gattServer = bluetoothManager.openGattServer(context, new BluetoothGattServerCallback() {
                @Override
                public void onConnectionStateChange(BluetoothDevice device, int status, int newState) {
                    if (newState == BluetoothProfile.STATE_CONNECTED) {
                        Log.d(TAG, "BLE GATT connected: " + device.getAddress());
                        if (callback != null) {
                            callback.onPeerConnected(device.getAddress(), device.getName() != null ? device.getName() : "Sasl Peer");
                        }
                    }
                }
                
                @Override
                public void onCharacteristicWriteRequest(BluetoothDevice device, int requestId,
                        BluetoothGattCharacteristic characteristic, boolean preparedWrite, 
                        boolean responseNeeded, int offset, byte[] value) {
                    String message = new String(value, StandardCharsets.UTF_8);
                    Log.d(TAG, "BLE received: " + message);
                    try {
                        String[] parts = message.split("\\|", 3);
                        String type = parts[0];
                        String data = parts.length > 1 ? parts[1] : "";
                        if ("ICE".equals(type) && callback != null) {
                            callback.onICECandidate(device.getAddress(), data);
                        } else if ("MSG".equals(type) && callback != null) {
                            callback.onMessageReceived(device.getAddress(), data);
                        }
                    } catch (Exception e) { Log.e(TAG, "Parse error", e); }
                    if (responseNeeded) {
                        gattServer.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null);
                    }
                }
            });
            
            BluetoothGattService saslService = new BluetoothGattService(
                UUID.fromString(SASL_SERVICE_UUID), BluetoothGattService.SERVICE_TYPE_PRIMARY);
            
            BluetoothGattCharacteristic idChar = new BluetoothGattCharacteristic(
                UUID.fromString(SASL_CHAR_IDENTITY_UUID),
                BluetoothGattCharacteristic.PROPERTY_READ,
                BluetoothGattCharacteristic.PERMISSION_READ);
            
            BluetoothGattCharacteristic msgChar = new BluetoothGattCharacteristic(
                UUID.fromString(SASL_CHAR_MESSAGE_UUID),
                BluetoothGattCharacteristic.PROPERTY_WRITE,
                BluetoothGattCharacteristic.PERMISSION_WRITE);
            
            BluetoothGattCharacteristic iceChar = new BluetoothGattCharacteristic(
                UUID.fromString(SASL_CHAR_ICE_UUID),
                BluetoothGattCharacteristic.PROPERTY_WRITE,
                BluetoothGattCharacteristic.PERMISSION_WRITE);
            
            saslService.addCharacteristic(idChar);
            saslService.addCharacteristic(msgChar);
            saslService.addCharacteristic(iceChar);
            gattServer.addService(saslService);
            bleReady = true;
            Log.d(TAG, "BLE GATT server ready — zero-network P2P active");
        }
    }
    
    // ============================================================
    // BLE SCAN
    // ============================================================
    
    public void startBLEScan() {
        if (!bleReady || bleScanner == null) { Log.w(TAG, "BLE scanner not ready"); return; }
        UUID serviceUuid = UUID.fromString(SASL_SERVICE_UUID);
        ScanFilter saslFilter = new ScanFilter.Builder()
            .setServiceUuid(new ParcelUuid(serviceUuid)).build();
        List<ScanFilter> filters = new ArrayList<>();
        filters.add(saslFilter);
        ScanSettings settings = new ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            bleScanner.startScan(filters, settings, new ScanCallback() {
                @Override
                public void onScanResult(int callbackType, ScanResult result) {
                    BluetoothDevice device = result.getDevice();
                    String name = device.getName() != null ? device.getName() : "SaslUser_" + device.getAddress().substring(device.getAddress().length() - 4);
                    int distance = estimateDistance(result.getRssi());
                    Log.d(TAG, "BLE discovered: " + name + " at " + distance + "m");
                    if (callback != null) {
                        callback.onPeerDiscovered(device.getAddress(), name, "ble", distance);
                    }
                }
                @Override
                public void onScanFailed(int errorCode) { Log.e(TAG, "BLE scan failed: " + errorCode); }
            });
            Log.d(TAG, "BLE scan started");
        }
    }
    
    public void stopBLEScan() {
        if (bleScanner != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            bleScanner.stopScan(new ScanCallback() {});
        }
    }
    
    // ============================================================
    // BLE CONNECT + DATA EXCHANGE
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
                        Log.d(TAG, "BLE connected: " + deviceAddress);
                        connectedGatts.put(deviceAddress, gatt);
                        gatt.discoverServices();
                        if (callback != null) callback.onPeerConnected(deviceAddress, device.getName() != null ? device.getName() : "Sasl Peer");
                    } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                        connectedGatts.remove(deviceAddress);
                        gatt.close();
                    }
                }
                @Override
                public void onCharacteristicChanged(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic) {
                    String value = new String(characteristic.getValue(), StandardCharsets.UTF_8);
                    if (callback != null) callback.onMessageReceived(deviceAddress, value);
                }
                @Override
                public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                    if (status == BluetoothGatt.GATT_SUCCESS) {
                        BluetoothGattService service = gatt.getService(UUID.fromString(SASL_SERVICE_UUID));
                        if (service != null) {
                            BluetoothGattCharacteristic msgChar = service.getCharacteristic(UUID.fromString(SASL_CHAR_MESSAGE_UUID));
                            if (msgChar != null) {
                                gatt.setCharacteristicNotification(msgChar, true);
                            }
                        }
                    }
                }
            }, BluetoothDevice.TRANSPORT_LE);
        }
    }
    
    public void sendOverBLE(String peerAddress, String type, String data) {
        BluetoothGatt gatt = connectedGatts.get(peerAddress);
        if (gatt == null) { Log.w(TAG, "No BLE connection to: " + peerAddress); return; }
        try {
            BluetoothGattService service = gatt.getService(UUID.fromString(SASL_SERVICE_UUID));
            if (service == null) return;
            UUID charUuid = "ICE".equals(type) ? UUID.fromString(SASL_CHAR_ICE_UUID) : UUID.fromString(SASL_CHAR_MESSAGE_UUID);
            BluetoothGattCharacteristic characteristic = service.getCharacteristic(charUuid);
            if (characteristic == null) return;
            String message = type + "|" + data + "|" + (myUsername != null ? myUsername : "Unknown");
            characteristic.setValue(message.getBytes(StandardCharsets.UTF_8));
            gatt.writeCharacteristic(characteristic);
            Log.d(TAG, "BLE sent to " + peerAddress + ": " + type);
        } catch (Exception e) { Log.e(TAG, "BLE send failed", e); }
    }
    
    // ============================================================
    // WIFI DIRECT — DISCOVERY + DATA SOCKET
    // ============================================================
    
    private void initWifiDirect() {
        wifiP2pManager = (WifiP2pManager) context.getSystemService(Context.WIFI_P2P_SERVICE);
        if (wifiP2pManager == null) { Log.w(TAG, "WiFi Direct not available"); return; }
        wifiP2pChannel = wifiP2pManager.initialize(context, Looper.getMainLooper(), null);
        
        wifiDirectReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION.equals(action)) {
                    if (wifiP2pManager != null) {
                        wifiP2pManager.requestPeers(wifiP2pChannel, new WifiP2pManager.PeerListListener() {
                            @Override
                            public void onPeersAvailable(WifiP2pDeviceList peers) {
                                for (WifiP2pDevice device : peers.getDeviceList()) {
                                    int distance = device.status == WifiP2pDevice.CONNECTED ? 10 : 50;
                                    Log.d(TAG, "WiFi Direct peer: " + device.deviceName);
                                    if (callback != null) {
                                        callback.onPeerDiscovered(device.deviceAddress, device.deviceName, "wifi-direct", distance);
                                    }
                                }
                            }
                        });
                    }
                }
                if (WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION.equals(action)) {
                    // Handle connection state changes
                }
            }
        };
        
        // Start server socket for incoming WiFi Direct data connections
        startWifiDirectServer();
        wifiDirectReady = true;
        Log.d(TAG, "WiFi Direct ready — server socket on port " + WIFI_DIRECT_PORT);
    }
    
    private void startWifiDirectServer() {
        new Thread(() -> {
            try {
                wifiDirectServerSocket = new ServerSocket(WIFI_DIRECT_PORT);
                wifiDirectServerRunning = true;
                Log.d(TAG, "WiFi Direct server listening on port " + WIFI_DIRECT_PORT);
                
                while (wifiDirectServerRunning) {
                    try {
                        Socket client = wifiDirectServerSocket.accept();
                        String clientAddr = client.getInetAddress().getHostAddress();
                        wifiDirectSockets.put(clientAddr, client);
                        Log.d(TAG, "WiFi Direct client connected: " + clientAddr);
                        if (callback != null) {
                            callback.onPeerConnected(clientAddr, "WiFi Direct Peer");
                        }
                        
                        // Start reading from this client
                        new Thread(() -> {
                            try {
                                InputStream in = client.getInputStream();
                                byte[] buffer = new byte[4096];
                                int bytesRead;
                                while ((bytesRead = in.read(buffer)) != -1) {
                                    String message = new String(buffer, 0, bytesRead, StandardCharsets.UTF_8);
                                    Log.d(TAG, "WiFi Direct received: " + message);
                                    if (callback != null) {
                                        callback.onMessageReceived(clientAddr, message);
                                    }
                                }
                            } catch (IOException e) {
                                Log.d(TAG, "WiFi Direct client disconnected: " + clientAddr);
                                wifiDirectSockets.remove(clientAddr);
                            }
                        }).start();
                        
                    } catch (IOException e) {
                        if (wifiDirectServerRunning) {
                            Log.e(TAG, "WiFi Direct accept error", e);
                        }
                    }
                }
            } catch (IOException e) {
                Log.e(TAG, "WiFi Direct server failed", e);
            }
        }).start();
    }
    
    public void startWifiDirectDiscovery() {
        if (!wifiDirectReady || wifiP2pManager == null) return;
        if (!wifiDirectReceiverRegistered && wifiDirectReceiver != null) {
            IntentFilter filter = new IntentFilter();
            filter.addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION);
            filter.addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION);
            context.registerReceiver(wifiDirectReceiver, filter);
            wifiDirectReceiverRegistered = true;
        }
        wifiP2pManager.discoverPeers(wifiP2pChannel, new WifiP2pManager.ActionListener() {
            @Override
            public void onSuccess() { Log.d(TAG, "WiFi Direct discovery started"); }
            @Override
            public void onFailure(int reason) { Log.e(TAG, "WiFi Direct discovery failed: " + reason); }
        });
    }
    
    public void sendOverWifiDirect(String peerAddress, String type, String data) {
        Socket socket = wifiDirectSockets.get(peerAddress);
        String message = type + "|" + data + "|" + (myUsername != null ? myUsername : "Unknown");
        
        if (socket != null && socket.isConnected()) {
            try {
                OutputStream out = socket.getOutputStream();
                out.write(message.getBytes(StandardCharsets.UTF_8));
                out.flush();
                Log.d(TAG, "WiFi Direct sent to " + peerAddress);
            } catch (IOException e) {
                Log.e(TAG, "WiFi Direct send failed", e);
            }
        } else {
            // Try to connect to the peer
            try {
                Socket newSocket = new Socket();
                newSocket.connect(new InetSocketAddress(peerAddress, WIFI_DIRECT_PORT), 5000);
                wifiDirectSockets.put(peerAddress, newSocket);
                OutputStream out = newSocket.getOutputStream();
                out.write(message.getBytes(StandardCharsets.UTF_8));
                out.flush();
                Log.d(TAG, "WiFi Direct connected + sent to " + peerAddress);
            } catch (IOException e) {
                Log.w(TAG, "WiFi Direct peer unreachable: " + peerAddress);
            }
        }
    }
    
    private void unregisterWifiDirectReceiver() {
        if (wifiDirectReceiverRegistered && wifiDirectReceiver != null) {
            try { context.unregisterReceiver(wifiDirectReceiver); } catch (Exception e) {}
            wifiDirectReceiverRegistered = false;
        }
    }
    
    private void stopWifiDirectServer() {
        wifiDirectServerRunning = false;
        try { if (wifiDirectServerSocket != null) wifiDirectServerSocket.close(); } catch (Exception e) {}
        for (Socket s : wifiDirectSockets.values()) { try { s.close(); } catch (Exception e) {} }
        wifiDirectSockets.clear();
    }
    
    // ============================================================
    // WI-FI AWARE
    // ============================================================
    
    private void initWifiAware() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            wifiAwareManager = (WifiAwareManager) context.getSystemService(Context.WIFI_AWARE_SERVICE);
            if (wifiAwareManager != null) {
                wifiAwareReady = true;
                Log.d(TAG, "Wi-Fi Aware ready (1000m range)");
            }
        }
    }
    
    public void startWifiAwareDiscovery() {
        if (!wifiAwareReady || wifiAwareManager == null) return;
        Log.d(TAG, "Wi-Fi Aware discovery started");
    }
    
    // ============================================================
    // HELPERS
    // ============================================================
    
    private int estimateDistance(int rssi) {
        int txPower = -59;
        if (rssi == 0) return -1;
        double ratio = (txPower - rssi) / 20.0;
        return (int) Math.round(Math.pow(10, ratio) * 100);
    }
    
    public void setIdentity(String id, String username) {
        this.myIdentity = id;
        this.myUsername = username;
    }
    
    public void setCallback(WaveMeshCallback callback) { this.callback = callback; }
    public boolean isBleReady() { return bleReady; }
    public boolean isWifiDirectReady() { return wifiDirectReady; }
    public boolean isWifiAwareReady() { return wifiAwareReady; }
    
    public void stop() {
        stopBLEScan();
        unregisterWifiDirectReceiver();
        stopWifiDirectServer();
        if (gattServer != null) gattServer.close();
        for (BluetoothGatt gatt : connectedGatts.values()) gatt.close();
        connectedGatts.clear();
    }
}
