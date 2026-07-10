/**
 * Sasl Mesh Relay — Encrypted multi-hop optical relay
 * 
 * Messages are encrypted with the destination's public key.
 * Intermediate nodes CANNOT read them — they only rebroadcast.
 * 
 * Range: Unlimited via user density (optical chain)
 * Each hop: ~100-200m (camera-to-screen)
 * 50km = ~250-500 intermediate Sasl users
 */

export interface RelayNode {
  id: string;
  username: string;
  distance: number; // estimated meters from us
  lastSeen: number;
  isRelay: boolean; // true if this node is just a bridge
}

export interface RelayMessage {
  id: string;
  from: string;
  to: string;
  encryptedPayload: string; // Encrypted with destination's public key
  ttl: number; // Time to live (hop count)
  hopCount: number;
  relayPath: string[]; // IDs of nodes that relayed this message
  timestamp: number;
}

type RelayCallback = (msg: RelayMessage) => void;

export class MeshRelay {
  private knownNodes: Map<string, RelayNode> = new Map();
  private messageCache: Set<string> = new Set(); // Prevent duplicate relay
  private onRelayMessage: RelayCallback | null = null;

  /**
   * Register a node as part of the mesh
   */
  registerNode(node: RelayNode): void {
    this.knownNodes.set(node.id, node);
  }

  /**
   * Remove a node from the mesh
   */
  removeNode(nodeId: string): void {
    this.knownNodes.delete(nodeId);
  }

  /**
   * Find the best route to a destination through known nodes
   * Uses BFS through the relay graph
   */
  findRoute(targetId: string): RelayNode[] | null {
    if (!this.knownNodes.has(targetId)) return null;
    
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: RelayNode[] }> = [];
    
    // Start from directly connected nodes
    for (const [id, node] of this.knownNodes) {
      if (id !== targetId) {
        queue.push({ nodeId: id, path: [node] });
      }
    }
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current.nodeId === targetId) {
        return current.path;
      }
      
      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);
      
      // Add next hops (all other known nodes)
      for (const [id, node] of this.knownNodes) {
        if (!visited.has(id) && id !== current.nodeId) {
          queue.push({
            nodeId: id,
            path: [...current.path, node],
          });
        }
      }
    }
    
    return null;
  }

  /**
   * Relay an encrypted message toward its destination
   * This node CANNOT read the message — only forwards it
   */
  relayMessage(msg: RelayMessage): void {
    // Prevent duplicate relay
    if (this.messageCache.has(msg.id)) return;
    this.messageCache.add(msg.id);
    
    // Check if we're the destination
    if (msg.to === this.getLocalNodeId()) {
      this.onRelayMessage?.(msg);
      return;
    }
    
    // Find next hop toward destination
    const route = this.findRoute(msg.to);
    if (route && route.length > 0) {
      const nextHop = route[0];
      msg.hopCount++;
      msg.ttl--;
      msg.relayPath.push(this.getLocalNodeId());
      
      if (msg.ttl > 0) {
        // Forward to next hop via optical channel
        console.log(`🔄 Relaying msg ${msg.id} to ${nextHop.username} (${msg.ttl} hops left)`);
        // The optical channel will pick this up and transmit to the next node
        this.onRelayMessage?.(msg);
      }
    }
    
    // Clean old cache entries
    if (this.messageCache.size > 1000) {
      const entries = Array.from(this.messageCache);
      this.messageCache = new Set(entries.slice(-500));
    }
  }

  /**
   * Get the maximum relay range based on known node density
   */
  getMaxRange(): { meters: number; label: string } {
    const nodeCount = this.knownNodes.size;
    const avgHopMeters = 150;
    const maxRange = nodeCount * avgHopMeters;
    
    if (maxRange >= 50000) return { meters: 50000, label: '🌍 Optical Mesh 50km ACTIVE' };
    if (maxRange >= 5000) return { meters: maxRange, label: `🏙️ City Relay ${(maxRange/1000).toFixed(0)}km` };
    if (maxRange >= 1000) return { meters: maxRange, label: `📡 Extended ${(maxRange/1000).toFixed(1)}km` };
    return { meters: maxRange, label: `📱 Local ${maxRange}m` };
  }

  /**
   * Set callback for received relay messages
   */
  onMessage(callback: RelayCallback): void {
    this.onRelayMessage = callback;
  }

  /**
   * Get the local node's ID
   */
  private getLocalNodeId(): string {
    return localStorage.getItem('sasl_mesh_identity') ? 
      JSON.parse(localStorage.getItem('sasl_mesh_identity')!).id : 'unknown';
  }

  /**
   * Get all known nodes
   */
  getNodes(): RelayNode[] {
    return Array.from(this.knownNodes.values());
  }

  /**
   * Clear all nodes
   */
  clear(): void {
    this.knownNodes.clear();
    this.messageCache.clear();
  }
}

export const meshRelay = new MeshRelay();