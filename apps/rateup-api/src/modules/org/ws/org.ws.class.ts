import { WebSocket } from "@fastify/websocket";
import crypto from "node:crypto";

class ConnectionManager {
  orgIdToAfterAuthIds = new Map<string, string[]>();
  afterAuthIdsToConnections = new Map<string, WebSocket[]>();

  generateAfterAuthIdforOrgId(orgId: string): string {
    let afterAuthIds = this.orgIdToAfterAuthIds.get(orgId);
    let afterAuthId = crypto.randomBytes(16).toString("hex");
    if (!afterAuthIds) {
      afterAuthIds = [];
      this.orgIdToAfterAuthIds.set(orgId, afterAuthIds);
    } else {
      while (this.afterAuthIdsToConnections.has(afterAuthId)) {
        afterAuthId = crypto.randomBytes(16).toString("hex");
      }
    }
    afterAuthIds.push(afterAuthId);
    return afterAuthId;
  }

  addConnection(afterAuthId: string, connection: WebSocket): void {
    let connections = this.afterAuthIdsToConnections.get(afterAuthId);
    if (!connections) {
      connections = [];
      this.afterAuthIdsToConnections.set(afterAuthId, connections);
    }
    connections.push(connection);
  }

  removeConnection(afterAuthId: string, connection: WebSocket): void {
    const connections = this.afterAuthIdsToConnections.get(afterAuthId);
    if (connections) {
      const index = connections.indexOf(connection);
      if (index !== -1) {
        connections.splice(index, 1);
      }
    }
  }

  getConnectionsBasedOnOrgId(orgId: string): WebSocket[] {
    const afterAuthIds = this.orgIdToAfterAuthIds.get(orgId) || [];
    const connections = afterAuthIds.flatMap(
      (afterAuthId) => this.afterAuthIdsToConnections.get(afterAuthId) || [],
    );
    return connections;
  }
}

export const connectionManager = new ConnectionManager();
