import { WebSocket } from "@fastify/websocket";
import crypto from "crypto";

class ConnectionManager {
  orgIdToAfterAuthIds = new Map<string, string[]>();
  afterAuthIdsToConnections = new Map<string, WebSocket[]>();

  generateAfterAuthIdforOrgId(orgId: string) {
    let afterAuthIds = this.orgIdToAfterAuthIds.get(orgId);
    let afterAuthId = crypto.randomBytes(16).toString("hex");
    if (!afterAuthIds) {
      afterAuthIds = [];
      this.orgIdToAfterAuthIds.set(orgId, afterAuthIds);
    } else {
      while (this.orgIdToAfterAuthIds.get(afterAuthId)) {
        afterAuthId = crypto.randomBytes(16).toString("hex");
      }
    }
    afterAuthIds.push(afterAuthId);
    return afterAuthId;
  }

  addConnection(afterAuthId: string, connection: WebSocket) {
    let connections = this.afterAuthIdsToConnections.get(afterAuthId);
    if (!connections) {
      connections = [];
      this.afterAuthIdsToConnections.set(afterAuthId, connections);
    }
    connections.push(connection);
  }

  removeConnection(afterAuthId: string, connection: WebSocket) {
    const connections = this.afterAuthIdsToConnections.get(afterAuthId);
    if (connections) {
      const index = connections.indexOf(connection);
      if (index !== -1) {
        connections.splice(index, 1);
      }
    }
  }

  getConnectionsBasedOnOrgId(orgId: string) {
    const afterAuthIds = this.orgIdToAfterAuthIds.get(orgId) || [];
    const connections = afterAuthIds.map((afterAuthId) =>
      this.afterAuthIdsToConnections.get(afterAuthId),
    );
    return connections.flat();
  }
}

export const connectionManager = new ConnectionManager();
