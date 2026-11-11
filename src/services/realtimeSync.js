import paho from 'paho-mqtt';

const BROKERS = [
  { host: 'broker.emqx.io', port: 8084, path: '/mqtt' },
  { host: 'broker.hivemq.com', port: 8884, path: '/mqtt' }
];

export function normalizeRoomCode(code) {
  if (!code) return '';
  const raw = code.trim().toUpperCase().replace(/\s+/g, '');
  if (!raw.startsWith('PT-') && raw.startsWith('PT')) {
    return 'PT-' + raw.substring(2);
  }
  return raw;
}

function getTopicPrefix(roomId) {
  const cleanId = normalizeRoomCode(roomId);
  return {
    state: `party-together-ytm/v1/rooms/${cleanId}/state`,
    actions: `party-together-ytm/v1/rooms/${cleanId}/actions`
  };
}

/**
 * Busca o estado e o broker de uma sala via MQTT nos brokers disponíveis.
 * Primeiro verifica o localStorage local (para mesma aba/máquina). Se não encontrar,
 * consulta os brokers WebSocket em paralelo, pois o anfitrião pode ter conectado a
 * qualquer um deles. O broker encontrado é devolvido para que o convidado envie
 * suas ações ao mesmo lugar que o anfitrião está ouvindo.
 */
export async function lookupRoomState(roomId, timeoutMs = 5000) {
  const cleanId = normalizeRoomCode(roomId);
  if (!cleanId) return null;

  // 1. Verificação instantânea no armazenamento local (mesmo navegador)
  try {
    const localRaw = localStorage.getItem(`party_room_${cleanId}`);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (parsed && parsed.roomId === cleanId && !parsed.closedAt) {
        return { state: parsed, brokerIndex: null };
      }
    }
  } catch {
    // Ignore storage parse error
  }

  // 2. Consulta remota nos brokers públicos. O host pode estar conectado a qualquer
  // um deles após o fallback de conexão, então consultar apenas o primeiro pode
  // fazer uma sala aberta parecer inexistente.
  return new Promise((resolve) => {
    let finished = false;
    let pendingLookups = BROKERS.length;
    const clients = [];

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        resolve(null);
      }
    }, timeoutMs);

    function cleanup() {
      while (clients.length > 0) {
        const client = clients.pop();
        try {
          client.disconnect();
        } catch {}
      }
    }

    const { state: stateTopic } = getTopicPrefix(cleanId);

    function finishLookup(data = null, brokerIndex = null) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      cleanup();
      resolve(data ? { state: data, brokerIndex } : null);
    }

    function markLookupFailed() {
      pendingLookups -= 1;
      if (pendingLookups === 0) finishLookup();
    }

    BROKERS.forEach((broker, index) => {
      let client;
      let lookupFinished = false;
      const markFailedOnce = () => {
        if (lookupFinished || finished) return;
        lookupFinished = true;
        markLookupFailed();
      };

      try {
        const clientId = `lk_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`;
        client = new paho.Client(broker.host, broker.port, broker.path, clientId);
        clients.push(client);

        client.onMessageArrived = (msg) => {
          if (finished || msg.destinationName !== stateTopic) return;
          try {
            const data = JSON.parse(msg.payloadString);
            if (data && data.roomId === cleanId && !data.closedAt) {
              finishLookup(data, index);
            }
          } catch {}
        };

        client.connect({
          useSSL: true,
          timeout: 4,
          onSuccess: () => {
            if (!finished) {
              client.subscribe(stateTopic, {
                onFailure: (err) => {
                  console.warn(`[RealtimeSync] Falha ao consultar ${broker.host}:`, err?.errorMessage);
                  markFailedOnce();
                }
              });
            }
          },
          onFailure: (err) => {
            console.warn(`[RealtimeSync] Falha ao consultar ${broker.host}:`, err?.errorMessage);
            markFailedOnce();
          }
        });
      } catch (err) {
        console.warn(`[RealtimeSync] Erro ao consultar ${broker.host}:`, err);
        markFailedOnce();
      }
    });
  });
}

/**
 * Inicializa a sincronização em tempo real de uma sala.
 * Conecta via MQTT (global para toda a internet/outros navegadores) + BroadcastChannel (mesma máquina).
 */
export function startRoomSync({ roomId, isHost, initialState, brokerIndex: preferredBrokerIndex, onStateUpdate, onAction }) {
  const cleanId = normalizeRoomCode(roomId);
  const { state: stateTopic, actions: actionsTopic } = getTopicPrefix(cleanId);
  const clientId = `pt_${isHost ? 'host' : 'guest'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let isDestroyed = false;
  let mqttClient = null;
  let broadcastChannel = null;
  let lastKnownState = initialState || null;
  const pendingActions = [];
  const processedActionIds = new Set();

  function receiveAction(action) {
    if (!action || (action.actionId && processedActionIds.has(action.actionId))) return;
    if (action.actionId) {
      processedActionIds.add(action.actionId);
      if (processedActionIds.size > 500) processedActionIds.delete(processedActionIds.values().next().value);
    }
    if (onAction && isHost) onAction(action);
  }

  function flushStateToMqtt() {
    if (!mqttClient || !mqttClient.isConnected() || !lastKnownState) return;
    try {
      const msg = new paho.Message(JSON.stringify(lastKnownState));
      msg.destinationName = stateTopic;
      msg.retained = true;
      msg.qos = 1;
      mqttClient.send(msg);
      console.log('[RealtimeSync] Estado da sala enviado com sucesso via MQTT (retained=true)');
    } catch (err) {
      console.warn('[RealtimeSync] Erro ao enviar estado via MQTT:', err);
    }
  }

  function flushPendingActions() {
    if (!mqttClient || !mqttClient.isConnected()) return;
    while (pendingActions.length > 0) {
      const action = pendingActions.shift();
      try {
        const msg = new paho.Message(JSON.stringify(action));
        msg.destinationName = actionsTopic;
        msg.qos = 1;
        mqttClient.send(msg);
      } catch (err) {
        console.warn('[RealtimeSync] Erro ao enviar ação pendente via MQTT:', err);
      }
    }
  }

  // 1. Canal local para comunicação instantânea entre abas no mesmo navegador
  try {
    broadcastChannel = new BroadcastChannel(`party_channel_${cleanId}`);
    broadcastChannel.onmessage = (event) => {
      if (isDestroyed || !event.data) return;
      const { type, payload } = event.data;
      if (type === 'ROOM_STATE' && onStateUpdate) {
        onStateUpdate(payload, 'local');
      } else if (type === 'ACTION' && onAction && isHost) {
        receiveAction(payload);
      }
    };
  } catch {}

  // 2. Conexão global MQTT WebSocket
  let brokerIndex = Number.isInteger(preferredBrokerIndex) ? preferredBrokerIndex : 0;

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
            receiveAction(payload);
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
          console.log(`[RealtimeSync] Conectado ao MQTT broker como ${isHost ? 'HOST' : 'GUEST'}`);
          mqttClient.subscribe(stateTopic);

          if (isHost) {
            mqttClient.subscribe(actionsTopic);
            // Publica imediatamente o estado inicial retido da sala
            flushStateToMqtt();
          } else {
            flushPendingActions();
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
      lastKnownState = state;

      // 1. Atualiza localStorage como cache local
      try {
        localStorage.setItem(`party_room_${cleanId}`, JSON.stringify(state));
      } catch {}

      // 2. Envia no BroadcastChannel local
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({ type: 'ROOM_STATE', payload: state });
        } catch {}
      }

      // 3. Envia no MQTT ou fica pendente para envio imediato assim que conectar
      if (mqttClient && mqttClient.isConnected()) {
        flushStateToMqtt();
      }
    },

    sendAction(action) {
      if (isDestroyed) return;
      const actionWithId = { ...action, actionId: action.actionId || `act_${Date.now()}_${Math.random().toString(36).slice(2, 10)}` };

      // 1. Dispara no BroadcastChannel local
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({ type: 'ACTION', payload: actionWithId });
        } catch {}
      }

      // 2. Dispara no MQTT
      if (mqttClient && mqttClient.isConnected()) {
        try {
          const msg = new paho.Message(JSON.stringify(actionWithId));
          msg.destinationName = actionsTopic;
          msg.qos = 1;
          mqttClient.send(msg);
        } catch (err) {
          console.warn('[RealtimeSync] Erro ao enviar ação via MQTT:', err);
        }
      } else {
        pendingActions.push(actionWithId);
      }
    },

    clearRetainedState() {
      if (!mqttClient || !mqttClient.isConnected()) return;
      try {
        const msg = new paho.Message('');
        msg.destinationName = stateTopic;
        msg.retained = true;
        msg.qos = 1;
        mqttClient.send(msg);
      } catch (err) {
        console.warn('[RealtimeSync] Erro ao limpar mensagem retida via MQTT:', err);
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
