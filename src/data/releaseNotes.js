export const NEWS_STORAGE_KEY = 'party_seen_news_version';

/**
 * Histórico de novidades exibido ao usuário.
 * Sempre que novas implementações subirem para produção, adicione um novo item
 * no topo desta lista com uma nova `version` (ex: '2026-12-01.1').
 * O sistema compara `LATEST_RELEASE_VERSION` com o valor salvo no navegador do usuário
 * e exibe a notificação automaticamente ao entrar na party.
 */
export const RELEASE_NOTES = [
  {
    version: '2026-11-24.1',
    date: 'Novembro 2026',
    title: 'Novidades na Party',
    highlights: [
      {
        title: 'Marcar usuários no chat (@) com alerta sonoro',
        description: 'Digite @ no chat ou clique em @ nos participantes para marcar alguém. Quem for marcado recebe destaque visual e um toque sonoro exclusivo.'
      },
      {
        title: 'Pontuação da festa visível para todos',
        description: 'Acompanhe sua pontuação no topo da sala e a pontuação de cada participante na lista da festa em tempo real.'
      },
      {
        title: 'Notificação automática de novidades',
        description: 'Sempre que novas implementações subirem para produção, você receberá um aviso com as novidades assim que entrar na party.'
      },
      {
        title: 'Rei da Festa',
        description: 'Interaja no chat, adicione músicas, vote e solte efeitos para acumular pontos e conquistar a coroa de Rei da Festa!'
      },
      {
        title: 'Importar Playlist do YouTube / YT Music',
        description: 'Cole o link de uma playlist na busca para extrair e adicionar até 100 músicas automaticamente na fila da party.'
      },
      {
        title: 'Sugestões na Busca',
        description: 'Enquanto uma música está tocando, a aba Buscar Música sugere automaticamente faixas parecidas antes mesmo de você digitar.'
      },
      {
        title: 'Enquete de Tema no Chat',
        description: 'Qualquer participante pode criar uma enquete (pelo chat ou pelo botão no topo) para votar no próximo tema da party, e o anfitrião pode aplicar o tema vencedor com um clique.'
      }
    ]
  },
  {
    version: '2026-10-01.1',
    date: 'Atualizações anteriores',
    title: 'Recursos da Festa',
    highlights: [
      {
        title: 'Animações de Festa ao Vivo',
        description: 'Solte balões, fogos de artifício, confetes e itens de festa sincronizados na tela de todos os participantes.'
      },
      {
        title: 'Chat Aprimorado',
        description: 'Edite ou exclua seus próprios comentários, use GIFs do Tenor e adicione emojis ao campo de texto antes de enviar.'
      },
      {
        title: 'Player Mais Estável e Sincronização Global',
        description: 'Corrigidos bugs de repetição e travamentos; quando o anfitrião clica em "Sincronizar player", todos os participantes sincronizam juntos.'
      },
      {
        title: 'Temas e Descrição da Festa',
        description: 'Sugestões temáticas ao criar ou editar a sala, além de uma descrição opcional visível para todos os participantes.'
      },
      {
        title: 'Limpar Playlist e Chat (Anfitrião)',
        description: 'Botões exclusivos para o administrador limpar toda a fila de músicas (mantendo a faixa atual) ou limpar o histórico do chat.'
      },
      {
        title: 'Controle de Sincronia e Tradução de Letras',
        description: 'Botões -0.5s / +0.5s para ajustar a velocidade da letra e seletor de idioma sempre visível.'
      },
      {
        title: 'Convite Personalizado e Layout Adaptativo',
        description: 'O botão Convidar copia uma mensagem pronta com nome da party, música atual, PIN e link direto, com interface responsiva.'
      },
      {
        title: 'Votação para Pular e Avatares',
        description: 'Votação democrática para pular música (timer de 30s), controle da barra de progresso pelo anfitrião e avatares personalizados.'
      }
    ]
  }
];

export const LATEST_RELEASE_VERSION = RELEASE_NOTES[0]?.version || '1.0.0';
