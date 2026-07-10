import Foundation
import CoreBluetooth
import MultipeerConnectivity

/**
 * Sasl WaveMesh Native P2P Service — iOS
 *
 * Handles ALL offline connectivity layers:
 * - BLE GATT Server (other phones connect to us)
 * - BLE GATT Client (we connect to other phones)
 * - Multipeer Connectivity (Apple's P2P, replaces WiFi Direct + Wi-Fi Aware)
 * - WebRTC ICE candidate relay over BLE/Multipeer
 */
@objc(WaveMeshNativeService)
class WaveMeshNativeService: NSObject {
    
    static let shared = WaveMeshNativeService()
    
    // BLE
    private var centralManager: CBCentralManager!
    private var peripheralManager: CBPeripheralManager!
    private var connectedPeripherals: [String: CBPeripheral] = [:]
    private var discoveredPeers: Set<String> = []
    
    // BLE UUIDs for Sasl WaveMesh
    let saslServiceUUID = CBUUID(string: "0000SASL-0000-1000-8000-00805F9B34FB")
    let saslCharIdentityUUID = CBUUID(string: "0000SAS1-0000-1000-8000-00805F9B34FB")
    let saslCharMessageUUID = CBUUID(string: "0000SAS2-0000-1000-8000-00805F9B34FB")
    let saslCharICEUUID = CBUUID(string: "0000SAS3-0000-1000-8000-00805F9B34FB")
    
    // Multipeer Connectivity
    private var mcSession: MCSession!
    private var mcAdvertiser: MCNearbyServiceAdvertiser!
    private var mcBrowser: MCNearbyServiceBrowser!
    private var mcPeerID: MCPeerID!
    
    // State
    private var bleReady = false
    private var multipeerReady = false
    private var myIdentity = ""
    private var myUsername = ""
    
    // Callback
    var onPeerDiscovered: ((String, String, String, Int) -> Void)?
    var onPeerConnected: ((String, String) -> Void)?
    var onMessageReceived: ((String, String) -> Void)?
    var onICECandidate: ((String, String) -> Void)?
    
    override init() {
        super.init()
        initBLE()
        initMultipeer()
    }
    
    // ============================================================
    // BLE INITIALIZATION
    // ============================================================
    
    private func initBLE() {
        centralManager = CBCentralManager(delegate: self, queue: nil)
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
    }
    
    func startBLEScan() {
        guard centralManager.state == .poweredOn else { return }
        centralManager.scanForPeripherals(
            withServices: [saslServiceUUID],
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]
        )
        print("🔍 iOS BLE scan started for Sasl devices")
    }
    
    func stopBLEScan() {
        centralManager.stopScan()
    }
    
    func connectToPeer(_ deviceUUID: String) {
        guard let uuid = UUID(uuidString: deviceUUID) else { return }
        let peripherals = centralManager.retrievePeripherals(withIdentifiers: [uuid])
        if let peripheral = peripherals.first {
            centralManager.connect(peripheral, options: nil)
        }
    }
    
    func sendOverBLE(peerAddress: String, type: String, data: String) {
        guard let peripheral = connectedPeripherals[peerAddress] else { return }
        let message = "\(type)|\(data)|\(myUsername)"
        if let messageData = message.data(using: .utf8) {
            // Find the message characteristic and write
            peripheral.services?.forEach { service in
                service.characteristics?.forEach { characteristic in
                    if characteristic.uuid == saslCharMessageUUID || characteristic.uuid == saslCharICEUUID {
                        peripheral.writeValue(messageData, for: characteristic, type: .withResponse)
                    }
                }
            }
        }
    }
    
    // ============================================================
    // MULTIPEER CONNECTIVITY (iOS P2P — replaces WiFi Direct + Wi-Fi Aware)
    // ============================================================
    
    private func initMultipeer() {
        mcPeerID = MCPeerID(displayName: UIDevice.current.name)
        mcSession = MCSession(peer: mcPeerID, securityIdentity: nil, encryptionPreference: .required)
        mcSession.delegate = self
        
        mcAdvertiser = MCNearbyServiceAdvertiser(
            peer: mcPeerID,
            discoveryInfo: ["type": "sasl_wavemesh", "username": myUsername],
            serviceType: "sasl-mesh"
        )
        mcAdvertiser.delegate = self
        
        mcBrowser = MCNearbyServiceBrowser(peer: mcPeerID, serviceType: "sasl-mesh")
        mcBrowser.delegate = self
        
        multipeerReady = true
        print("📱 iOS Multipeer ready (Apple P2P — 100m+)")
    }
    
    func startMultipeerDiscovery() {
        mcAdvertiser.startAdvertisingPeer()
        mcBrowser.startBrowsingForPeers()
        print("📱 Multipeer browsing + advertising")
    }
    
    func stopMultipeer() {
        mcAdvertiser.stopAdvertisingPeer()
        mcBrowser.stopBrowsingForPeers()
    }
    
    func sendOverMultipeer(_ text: String) {
        guard mcSession.connectedPeers.count > 0 else { return }
        if let data = text.data(using: .utf8) {
            try? mcSession.send(data, toPeers: mcSession.connectedPeers, with: .reliable)
        }
    }
    
    // ============================================================
    // IDENTITY
    // ============================================================
    
    func setIdentity(id: String, username: String) {
        self.myIdentity = id
        self.myUsername = username
    }
    
    func getCapabilities() -> [String: Bool] {
        return [
            "bleReady": bleReady,
            "multipeerReady": multipeerReady,
            "wifiDirectReady": false,
            "wifiAwareReady": false
        ]
    }
}

// ============================================================
// BLE CENTRAL MANAGER DELEGATE
// ============================================================

extension WaveMeshNativeService: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        bleReady = central.state == .poweredOn
        if bleReady {
            // Start advertising as BLE peripheral
            startAdvertising()
        }
    }
    
    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                       advertisementData: [String : Any], rssi RSSI: NSNumber) {
        let name = peripheral.name ?? "SaslUser_\(peripheral.identifier.uuidString.suffix(4))"
        let distance = estimateDistance(rssi: RSSI.intValue)
        
        onPeerDiscovered?(peripheral.identifier.uuidString, name, "ble", distance)
        print("🔵 BLE discovered: \(name) at \(distance)m")
    }
    
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        let id = peripheral.identifier.uuidString
        connectedPeripherals[id] = peripheral
        peripheral.delegate = self
        peripheral.discoverServices([saslServiceUUID])
        
        onPeerConnected?(id, peripheral.name ?? "Sasl Peer")
        print("🔗 BLE connected: \(id)")
    }
    
    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        let id = peripheral.identifier.uuidString
        connectedPeripherals.removeValue(forKey: id)
        print("🔌 BLE disconnected: \(id)")
    }
}

// ============================================================
// BLE PERIPHERAL DELEGATE
// ============================================================

extension WaveMeshNativeService: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        peripheral.services?.forEach { service in
            peripheral.discoverCharacteristics(
                [saslCharMessageUUID, saslCharICEUUID, saslCharIdentityUUID],
                for: service
            )
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        service.characteristics?.forEach { characteristic in
            if characteristic.uuid == saslCharMessageUUID || characteristic.uuid == saslCharICEUUID {
                peripheral.setNotifyValue(true, for: characteristic)
            }
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard let value = characteristic.value,
              let message = String(data: value, encoding: .utf8) else { return }
        
        let parts = message.components(separatedBy: "|")
        let type = parts.count > 0 ? parts[0] : ""
        let data = parts.count > 1 ? parts[1] : ""
        let from = parts.count > 2 ? parts[2] : peripheral.identifier.uuidString
        
        if type == "ICE" {
            onICECandidate?(peripheral.identifier.uuidString, data)
        } else {
            onMessageReceived?(from, data)
        }
    }
}

// ============================================================
// BLE PERIPHERAL MANAGER DELEGATE (GATT Server)
// ============================================================

extension WaveMeshNativeService: CBPeripheralManagerDelegate {
    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        if peripheral.state == .poweredOn {
            startAdvertising()
        }
    }
    
    private func startAdvertising() {
        let identityChar = CBMutableCharacteristic(
            type: saslCharIdentityUUID,
            properties: .read,
            value: myUsername.data(using: .utf8),
            permissions: .readable
        )
        
        let messageChar = CBMutableCharacteristic(
            type: saslCharMessageUUID,
            properties: .write,
            value: nil,
            permissions: .writeable
        )
        
        let iceChar = CBMutableCharacteristic(
            type: saslCharICEUUID,
            properties: .write,
            value: nil,
            permissions: .writeable
        )
        
        let service = CBMutableService(type: saslServiceUUID, primary: true)
        service.characteristics = [identityChar, messageChar, iceChar]
        
        peripheralManager.add(service)
        peripheralManager.startAdvertising([
            CBAdvertisementDataServiceUUIDsKey: [saslServiceUUID],
            CBAdvertisementDataLocalNameKey: "Sasl_\(myUsername)"
        ])
        
        print("📢 iOS BLE GATT advertising as Sasl device")
    }
    
    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        for request in requests {
            guard let value = request.value,
                  let message = String(data: value, encoding: .utf8) else { continue }
            
            let parts = message.components(separatedBy: "|")
            let type = parts.count > 0 ? parts[0] : ""
            let data = parts.count > 1 ? parts[1] : ""
            let from = parts.count > 2 ? parts[2] : request.central.identifier.uuidString
            
            if type == "ICE" {
                onICECandidate?(request.central.identifier.uuidString, data)
            } else {
                onMessageReceived?(from, data)
            }
            
            peripheral.respond(to: request, withResult: .success)
        }
    }
}

// ============================================================
// MULTIPEER DELEGATES
// ============================================================

extension WaveMeshNativeService: MCSessionDelegate {
    func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
        switch state {
        case .connected:
            onPeerConnected?(peerID.displayName, peerID.displayName)
            print("📱 Multipeer connected: \(peerID.displayName)")
        case .notConnected:
            print("📱 Multipeer disconnected: \(peerID.displayName)")
        default: break
        }
    }
    
    func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
        if let message = String(data: data, encoding: .utf8) {
            onMessageReceived?(peerID.displayName, message)
        }
    }
    
    func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {}
    func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) {}
    func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {}
}

extension WaveMeshNativeService: MCNearbyServiceAdvertiserDelegate {
    func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peerID: MCPeerID,
                   withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
        invitationHandler(true, mcSession)
    }
}

extension WaveMeshNativeService: MCNearbyServiceBrowserDelegate {
    func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo info: [String : String]?) {
        let distance = 50
        onPeerDiscovered?(peerID.displayName, peerID.displayName, "multipeer", distance)
        browser.invitePeer(peerID, to: mcSession, withContext: nil, timeout: 30)
    }
    
    func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {}


    // ============================================================
    // OPTICAL DATA CHANNEL — Camera & Screen Control
    // ============================================================
    
    private var opticalChannelActive = false
    private var screenBrightness: Float = 0.5
    
    func initOpticalChannel() {
        opticalChannelActive = true
        print("📷 iOS Optical channel initialized")
    }
    
    func setScreenBrightness(_ level: Float) {
        // Level 0.0-1.0
        screenBrightness = level
        DispatchQueue.main.async {
            UIScreen.main.brightness = level
        }
    }
    
    func getScreenBrightness() -> Float {
        return Float(UIScreen.main.brightness)
    }
    
    func isOpticalActive() -> Bool {
        return opticalChannelActive
    }
    
    func stopOpticalChannel() {
        opticalChannelActive = false
        DispatchQueue.main.async {
            UIScreen.main.brightness = 0.5
        }
        print("📷 iOS Optical channel stopped")
    }

}

// ============================================================
// HELPERS
// ============================================================

extension WaveMeshNativeService {
    private func estimateDistance(rssi: Int) -> Int {
        let txPower = -59
        if rssi == 0 { return -1 }
        let ratio = Double(txPower - rssi) / 20.0
        return Int(round(pow(10, ratio) * 100))
    }
}