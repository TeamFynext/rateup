import { WebSocket } from "@fastify/websocket";

class ConnectionManager {
  orgIdToConnections = new Map<string, WebSocket[]>();

  addConnection(orgId: string, connection: WebSocket) {
    let connections = this.orgIdToConnections.get(orgId);
    if (!connections) {
      connections = [];
      this.orgIdToConnections.set(orgId, connections);
    }

    connections.push(connection);
  }

  removeConnection(orgId: string, connection: WebSocket) {
    const connections = this.orgIdToConnections.get(orgId);
    if (connections) {
      const index = connections.indexOf(connection);
      if (index !== -1) {
        connections.splice(index, 1);
      }
    }
  }

  getConnections(orgId: string) {
    return this.orgIdToConnections.get(orgId) || [];
  }
}

export const connectionManager = new ConnectionManager();
