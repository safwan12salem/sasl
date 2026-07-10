package app.sasl.wavemesh;

import android.content.Context;
import android.hardware.camera2.CameraManager;
import android.os.Build;
import android.util.Log;

public class WaveMeshNativeService {
    private static final String TAG = "WaveMeshNative";
    private static WaveMeshNativeService instance;
    
    private Context context;
    private CameraManager cameraManager;
    private boolean opticalChannelActive = false;
    private int screenBrightness = 128;
    private String myIdentity;
    private String myUsername;
    
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
        initOpticalChannel();
    }
    
    // ============================================================
    // OPTICAL DATA CHANNEL
    // ============================================================
    
    private void initOpticalChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cameraManager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
        }
        opticalChannelActive = true;
        Log.d(TAG, "📷 Optical channel initialized");
    }
    
    public void setScreenBrightness(int level) {
        this.screenBrightness = level;
    }
    
    public int getScreenBrightness() {
        return screenBrightness;
    }
    
    public boolean isOpticalActive() {
        return opticalChannelActive;
    }
    
    // ============================================================
    // CAPABILITIES
    // ============================================================
    
    public boolean isBleReady() { return false; }
    public boolean isWifiDirectReady() { return false; }
    public boolean isWifiAwareReady() { return false; }
    
    // ============================================================
    // IDENTITY
    // ============================================================
    
    public void setIdentity(String id, String username) {
        this.myIdentity = id;
        this.myUsername = username;
    }
    
    public void setCallback(WaveMeshCallback callback) {
        this.callback = callback;
    }
    
    public void stop() {
        opticalChannelActive = false;
        Log.d(TAG, "📷 Optical channel stopped");
    }
}
