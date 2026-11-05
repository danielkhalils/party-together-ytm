# 🎵 Party Together — YouTube Music Sync

<div align="center">

**Ouça YouTube Music sincronizado em tempo real com seus amigos, monte filas colaborativas com votação e cante com letras sincronizadas no estilo BetterLyrics.**

[![React](https://img.shields.io/badge/React-19.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3.6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Oxlint](https://img.shields.io/badge/Lint-Oxlint-cyan?style=for-the-badge)](https://oxc.rs/)

</div>

---

## 🎯 Sobre o Projeto & Propósito

O **Party Together** nasceu com o propósito de proporcionar uma experiência musical compartilhada de alta qualidade, transformando a reprodução individual do **YouTube Music** em uma verdadeira sessão social colaborativa online (Listen Along / Party Room).

Seja para estudar com amigos, animar uma chamada no Discord ou curtir uma festa virtual, a aplicação permite que um grupo de pessoas ouça exatamente a mesma faixa no mesmo segundo, vote democraticamente nas próximas músicas que irão tocar e acompanhe as letras em tempo real com auto-scroll dinâmico.

---

## ✨ Principais Funcionalidades

### 🎧 1. Sincronização em Tempo Real (Host & Guests)
- **Sala com Código e PIN**: Cada sessão gera um código exclusivo (ex.: `PT-A1B2`) e um PIN de acesso de 4 dígitos para privacidade da turma.
- **Drift Correction (Correção de Desvio)**: O player monitora a reprodução a cada 250ms; caso o participante se afaste mais de 2 segundos do tempo do Anfitrião, um salto automático (`seekTo`) ajusta a faixa sem interrupções bruscas.
- **Heartbeat do Host**: A cada 5 segundos de reprodução, o Anfitrião emite um sinal de sincronia para manter todos alinhados.
- **Áudio Unlock**: Interface inteligente que orienta convidados a ativarem o som no navegador com 1 clique, contornando bloqueios nativos de autoplay de navegadores modernos.
- **Controles Exclusivos do Host**: Apenas o anfitrião possui permissão para pausar, dar play ou pular faixas, garantindo a ordem da festa.

### 🔍 2. Busca e Catálogo do YouTube Music
- **Busca em Tempo Real**: Campo de pesquisa conectado diretamente à API não oficial do YouTube Music via middleware Vite com debounce automático (450ms).
- **Suporte a Links Diretos**: Possibilidade de colar links diretos do YouTube ou IDs de vídeo (`watch?v=...` ou `youtu.be/...`).
- **Início Imediato ou Enfileiramento**: Se nenhuma música estiver tocando, a primeira faixa selecionada toca instantaneamente; caso contrário, vai para a fila.

### 🗳️ 3. Fila Colaborativa com Upvotes
- **Votação Democrática**: Qualquer membro da sala pode adicionar faixas e votar nas músicas adicionadas por outros participantes.
- **Reordenação Automática**: A fila é automaticamente reordenada pelas faixas com maior número de votos.
- **Identificação de Participantes**: Cada item da fila mostra quem foi a pessoa responsável por adicionar a música.
- **Avanço Automático**: Quando a música atual atinge o final, o player carrega automaticamente a mais votada da fila.

### 🎤 4. Letras Sincronizadas (Estilo BetterLyrics / Karaokê)
- **Integração com LRCLIB**: Busca automática de letras no formato `.lrc` (com timestamp) ao mudar de música.
- **Higienização Inteligente**: Limpeza de sufixos de videoclipes (ex.: *Official Music Video, Visualizer, 4K, HD, Topic, Vevo*) para garantir máxima precisão na localização da letra original.
- **Auto-scroll Suave**: A letra acompanha a faixa e centraliza a estrofe atual na tela automaticamente.
- **Navegação Interativa**: O Anfitrião pode clicar em qualquer verso da letra para pular a música instantaneamente para aquele ponto (`Seek to Lyric`).
- **Fallback Estático**: Caso a letra com sincronia linha a linha não exista, a aplicação exibe a versão em texto puro.

### 🎨 5. Interface Imersiva & Moderna
- **Lobby com Mosaico Dinâmico**: Tela inicial inspirada no design da Netflix e Spotify, com mosaico inclinado de capas de álbuns e vinhetas gradientes.
- **Avatares Fofos Aleatórios**: Geração automática de avatares com a API do DiceBear (`fun-emoji`, `bottts`, `thumbs`, `adventurer`).
- **Brilho Ambiente Reativo**: Plano de fundo dinâmico que projeta as cores e a capa do álbum atual em blur suave pela tela inteira.
- **Controle de Volume Individual**: Cada usuário ajusta o próprio volume ou silencia o som sem afetar o restante da sala.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Finalidade |
| :--- | :--- |
| **[React 19](https://react.dev/)** | Biblioteca base para construção da interface declarativa e reativa |
| **[Vite 8](https://vitejs.dev/)** | Bundler ultra rápido e servidor de desenvolvimento local |
| **[Tailwind CSS v4](https://tailwindcss.com/)** | Estilização utilitária de ponta via plugin oficial `@tailwindcss/vite` |
| **[Lucide React](https://lucide.dev/)** | Conjunto completo de ícones modernos para a UI |
| **[ytmusic-api](https://github.com/get-vi/ytmusic-api)** | Integração com catálogo e metadados de busca do YouTube Music |
| **[YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference)** | Motor de reprodução de áudio e vídeo em alta fidelidade |
| **[LRCLIB API](https://lrclib.net/)** | Provedor de letras de músicas sincronizadas linha a linha |
| **[DiceBear API](https://dicebear.com/)** | Provedor de avatares vetoriais aleatórios para participantes |
| **[BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)** | Comunicação em tempo real entre abas no mesmo navegador |
| **[Oxlint](https://oxc.rs/)** | Linter em Rust de alta performance para validação do código |

---

## 📂 Estrutura de Arquivos

```text
party-together-ytm/
├── public/                 # Favicons e ativos estáticos da aplicação
├── src/
│   ├── assets/             # Recursos de mídia e imagens
│   ├── App.jsx             # Componente central com toda a lógica da sala, player, letras e UI
│   ├── App.css             # Estilos auxiliares
│   ├── index.css           # Configuração de temas e importação do Tailwind CSS v4
│   └── main.jsx            # Ponto de montagem React no DOM
├── index.html              # Template HTML principal
├── package.json            # Dependências e scripts do projeto
├── vite.config.js          # Configuração do Vite + middleware local para a rota /api/search
└── .oxlintrc.json          # Regras de linting do Oxlint
```

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-requisitos
Certifique-se de possuir o **[Node.js](https://nodejs.org/)** (versão 18 ou superior) instalado em sua máquina.

### 2. Instalar as dependências
No terminal, dentro da pasta do projeto, execute:

```bash
npm install
```

### 3. Iniciar o servidor de desenvolvimento
Execute o comando:

```bash
npm run dev
```

O terminal exibirá a URL local (normalmente `http://localhost:5173/`). Abra o endereço em seu navegador favorito.

### 4. Demais Scripts Disponíveis
- **`npm run build`**: Gera a versão otimizada para produção na pasta `dist/`.
- **`npm run preview`**: Pré-visualiza localmente o build de produção.
- **`npm run lint`**: Executa a verificação estática do código via Oxlint.

---

## 👥 Como Testar a Experiência Multiusuário

Para testar a sincronização entre duas ou mais pessoas no mesmo computador:

1. **Aba 1 (Anfitrião / Host)**:
   - Acesse `http://localhost:5173/`.
   - Escolha o modo **"Criar Sessão (Host)"**, informe seu nickname e clique em **"Criar Party"**.
   - Note o **Código da Sala** gerado (ex.: `PT-XXXX`) e o **PIN** (padrão: `1234`).
   - Use a aba **"Buscar Música"** para pesquisar uma canção e colocá-la para tocar.

2. **Aba 2 (Convidado / Guest)**:
   - Abra uma **janela anônima** ou uma **nova aba** no mesmo navegador.
   - Escolha o modo **"Entrar com Código"**.
   - Digite seu nickname, cole o código da sala e o PIN.
   - Clique em **"🔊 Sincronizar e Ouvir Agora"** para liberar o áudio e sincronizar com o anfitrião.
   - Adicione novas músicas na fila, vote nelas e acompanhe a letra sincronizada em tempo real!

---

## 📝 Licença

Este projeto é desenvolvido para fins de estudo e entretenimento. Consulte os termos de serviço das APIs utilizadas (YouTube e LRCLIB) para maiores detalhes.
