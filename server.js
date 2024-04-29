const e = require("express");
const express = require("express");
const WebSocket = require("ws");

const app = express();
const port = 8888;

// Create a WebSocket server
const wss = new WebSocket.Server({ noServer: true });

const GenerateShareCode = () => {
  return Math.floor(10000 + Math.random() * 90000);
};
generateOriginCode = () => {
  return Math.random().toString(36).substr(2, 8);
};
let shareCodes = [];
let connections = [];

const addConnection = (ws) => {
  if (connections.includes(ws)) return;
  const wsCode = generateOriginCode();
  connections.push({ wsCode, ws });
  return wsCode;
};

const removeConnection = (ws) => {
  connections = connections.filter((connection) => connection.ws !== ws);
};

const getWsByOriginCode = (wsCode) => {
  return connections.find((connection) => connection.wsCode === wsCode);
};

console.log("Share Code", shareCodes);
const addShareCode = (ws, shareCode) => {
  console.log("Add Share Code", shareCode);
  shareCodes.push({ ws, shareCode });
};

const removeShareCode = (ws) => {
  shareCodes = shareCodes.filter((code) => code.ws !== ws);
};
const getWsByShareCode = (shareCode) => {
  return shareCodes.find((code) => code.shareCode === shareCode);
};
// Handle WebSocket connection
wss.on("connection", (ws) => {
  console.log("WebSocket connection established");
  // Handle incoming messages
  ws.on("message", (message) => {
    console.log(`Received message: ${message}`);
    const data = JSON.parse(message);
    switch (data.event) {
      case "HEARTBEAT":
        ws.send(
          JSON.stringify({
            event: "HEARTBEAT",
            data: { timestamp: new Date() },
          })
        );
        break;
      case "REQUIST_SHARE_CODE":
        const shareCode = GenerateShareCode();
        ws.send(JSON.stringify({ event: "SHARE_CODE", data: shareCode }));
        addShareCode(ws, shareCode);
        break;
      case "CONNECTION_REQUEST":
        console.log("Connection Request", parseInt(data.destination));
        const wsCode = addConnection(ws);
        let receiverWs = getWsByShareCode(parseInt(data.destination));
        setTimeout(() => {
          if (receiverWs) {
            receiverWs.ws.send(
              JSON.stringify({
                event: "CONNECTION_REQUEST",
                origin: wsCode,
              })
            );
            ws.send(
              JSON.stringify({
                event: "CONNECTION_REQUEST",
                data: { AssignedOriginCOde: wsCode, success: true },
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                event: "CONNECTION_REQUEST",
                data: { success: false },
              })
            );
          }
        }, 1000);

        break;
      case "CONNECTION_ACCEPT":
        console.log("Connection Accept", data.destination);
        const receiverConnection = getWsByOriginCode(data.destination);
        const wscodes = addConnection(ws);
        if (receiverConnection) {
          receiverConnection.ws.send(
            JSON.stringify({
              event: "CONNECTION_ACCEPT",
              origin: wscodes,
              data: { success: true, files: data.data.files },
            })
          );
        }
        break;
      default:
        console.log(data.event, data.data);
        const receiveConnn = getWsByOriginCode(data.destination);
        if (receiveConnn) {
          receiveConnn.ws.send(
            JSON.stringify({
              event: data.event,
              data: data.data,
            })
          );
        }
        break;
    }
  });
  // Handle WebSocket close event
  ws.on("close", () => {
    console.log("WebSocket connection closed");
    removeShareCode(ws);
  });
});

// Create an HTTP server
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Upgrade HTTP server to WebSocket server
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
