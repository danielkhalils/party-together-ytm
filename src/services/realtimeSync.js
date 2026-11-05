import paho from 'paho-mqtt';

const BROKERS = [
  { host: 'broker.emqx.io', port: 8084, path: '/mqtt' },
  { host: 'broker.hivemq.com', port: 8884, path: '/mqtt' }
];

function getTopicPrefix(roomId) {
  const cleanId = roomId.trim().toUpperCase();
  return {
    state: `party-together-ytm/v1/rooms/${cleanId}/state`,
    actions: `party-together-ytm/v1/rooms/${cleanId}/actions`
  };
}

/**
 * Busca o estado de uma sala remotamente via MQTT com fallback e timeout.
 * Primeiro verifica o localStorage local; se não encontrar, consulta o broker em tempo real.
 */
export async function lookupRoomState(roomId, timeoutMs = 2800) {
  const cleanId = roomId.trim().toUpperCase();

  // 1. Verificação instantânea no armazenamento local (mesmo navegador)
  try {
    const localRaw = localStorage.getItem(`party_room_${cleanId}`);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (parsed && parsed.roomId === cleanId) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse error
  }

  // 2. Consulta remota via WebSocket no broker público
  return new Promise((resolve) => {
    let finished = false;
    let client = null;

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        resolve(null);
      }
    }, timeoutMs);

    function cleanup() {
      if (client) {
        try {
          client.disconnect();
        } catch {}
        client = null;
      }
    }

    const { state: stateTopic } = getTopicPrefix(cleanId);
    const clientId = `lk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const broker = BROKERS[0];

    try {
      client = new paho.Client(broker.host, broker.port, broker.path, clientId);

      client.onMessageArrived = (msg) => {
        if (!finished && msg.destinationName === stateTopic) {
          try {
            const data = JSON.parse(msg.payloadString);
            if (data && data.roomId === cleanId) {
              finished = true;
              clearTimeout(timer);
              cleanup();
              resolve(data);
              return;
            }
          } catch {}
        }
      };

      client.connect({
        useSSL: true,
        timeout: 3,
        onSuccess: () => {
          if (!finished && client) {
            client.subscribe(stateTopic);
          }
        },
        onFailure: () => {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            cleanup();
            resolve(null);
          }
        }
      });
    } catch {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

/**
 * Inicializa a sincronização em tempo real de uma sala.
 * Conecta via MQTT (global para toda internet/outros navegadores) + BroadcastChannel (mesma máquina).
 */
export function startRoomSync({ roomId, isHost, onStateUpdate, onAction }) {
  const cleanId = roomId.trim().toUpperCase();
  const { state: stateTopic, actions: actionsTopic } = getTopicPrefix(cleanId);
  const clientId = `pt_${isHost ? 'host' : 'guest'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let isDestroyed = false;
  let mqttClient = null;
  let broadcastChannel = null;

  // 1. Canal local para comunicação instantânea entre abas no mesmo navegador
  try {
    broadcastChannel = new BroadcastChannel(`party_channel_${cleanId}`);
    broadcastChannel.onmessage = (event) => {
      if (isDestroyed || !event.data) return;
      const { type, payload } = event.data;
      if (type === 'ROOM_STATE' && onStateUpdate) {
        onStateUpdate(payload, 'local');
      } else if (type === 'ACTION' && onAction && isHost) {
        onAction(payload);
      }
    };
  } catch {}

  // 2. Conexão global MQTT WebSocket
  let brokerIndex = 0;

  function connectMqtt() {
    if (isDestroyed) return;

    const broker = BROKERS[brokerIndex % BROKERS.length];
    try {
      mqttClient = new paho.Client(broker.host, broker.port, broker.path, clientId);

      mqttClient.onConnectionLost = (responseObject) => {
        if (!isDestroyed && responseObject.errorCode !== 0) {
          console.warn('[RealtimeSync] Conexão perdida, reconectando em 2s...');
          brokerIndex++;
          setTimeout(connectMqtt, 2000);
        }
      };

      mqttClient.onMessageArrived = (message) => {
        if (isDestroyed) return;
        try {
          const payload = JSON.parse(message.payloadString);
          if (message.destinationName === stateTopic && onStateUpdate) {
            onStateUpdate(payload, 'remote');
          } else if (message.destinationName === actionsTopic && onAction && isHost) {
            onAction(payload);
          }
        } catch (err) {
          console.error('[RealtimeSync] Erro ao processar mensagem recebida:', err);
        }
      };

      mqttClient.connect({
        useSSL: true,
        timeout: 4,
        keepAliveInterval: 30,
        cleanSession: true,
        onSuccess: () => {
          if (isDestroyed || !mqttClient) return;
          // Inscreve-se no tópico de estado
          mqttClient.subscribe(stateTopic);

          // Se for anfitrião, inscreve-se também no tópico de ações vindas dos convidados
          if (isHost) {
            mqttClient.subscribe(actionsTopic);
          }
        },
        onFailure: (err) => {
          if (!isDestroyed) {
            console.warn('[RealtimeSync] Falha ao conectar ao broker, tentando alternativo em 3s:', err?.errorMessage);
            brokerIndex++;
            setTimeout(connectMqtt, 3000);
          }
        }
      });
    } catch (e) {
      console.warn('[RealtimeSync] Erro inicializando cliente MQTT:', e);
    }
  }

  connectMqtt();

  // Métodos expostos
  return {
    broadcastState(state) {
      if (isDestroyed) return;

      // Atualiza localStorage como cache local
      try {
        localStorage.setItem(`party_room_${cleanId}`, JSON.stringify(state));
      } catch {}

      // Envia no BroadcastChannel local
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({ type: 'ROOM_STATE', payload: state });
        } catch {}
      }

      // Envia no MQTT com retain=true para que novos participantes recebam imediatamente
      if (mqttClient && mqttClient.isConnected()) {
        try {
          const msg = new paho.Message(JSON.stringify(state));
          msg.destinationName = stateTopic;
          msg.retained = true;
          msg.qos = 1;
          mqttClient.send(msg);
        } catch (err) {
          console.warn('[RealtimeSync] Erro ao enviar estado via MQTT:', err);
        }
      }
    },

    sendAction(action) {
      if (isDestroyed) return;

      // Dispara via BroadcastChannel local
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({ type: 'ACTION', payload: action });
        } catch {}
      }

      // Dispara via MQTT para o Host
      if (mqttClient && mqttClient.isConnected()) {
        try {
          const msg = new paho.Message(JSON.stringify(action));
          msg.destinationName = actionsTopic;
          msg.qos = 1;
          mqttClient.send(msg);
        } catch (err) {
          console.warn('[RealtimeSync] Erro ao enviar ação via MQTT:', err);
        }
      }
    },

    destroy() {
      isDestroyed = true;
      if (broadcastChannel) {
        try {
          broadcastChannel.close();
        } catch {}
      }
      if (mqttClient) {
        try {
          mqttClient.disconnect();
        } catch {}
      }
    }
  };
}
