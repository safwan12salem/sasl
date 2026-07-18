package app.sasl.wavemesh;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

public class EchoRelayService extends Service {
    private static final String TAG = "EchoRelayService";
    private static final String CHANNEL_ID = "sasl_echo_relay";
    private WaveMeshNativeService meshService;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        meshService = WaveMeshNativeService.getInstance(this);
        Log.d(TAG, "Echo Relay Service created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = new Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Sasl Echo Relay")
            .setContentText("Extending mesh by ~200m • Tap to open")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .build();

        startForeground(1001, notification);
        
        // Keep BLE advertising active for relay
        if (meshService.isBleReady()) {
            String username = intent != null ? intent.getStringExtra("username") : "RelayNode";
            meshService.startAdvertising(username);
            meshService.startBLEScan();
            Log.d(TAG, "Echo Relay active — advertising + scanning");
        }

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (meshService != null) {
            meshService.stopAdvertising();
            meshService.stopBLEScan();
        }
        Log.d(TAG, "Echo Relay Service stopped");
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Sasl Echo Relay",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps WaveMesh relay active in background");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }
}
