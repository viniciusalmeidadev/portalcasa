# 🏠 Lista de Itens para Casa

Um website moderno, responsivo e interativo para gerenciar itens domésticos e planejar compras. A aplicação é totalmente autônoma, roda direto no navegador e salva seus dados localmente com persistência imediata.

---

## ✨ Recursos

- **📦 Gerenciamento Completo (CRUD)**: Cadastre, edite e exclua itens de forma fácil.
- **🏷️ Categorização Inteligente**: Organize seus itens por categorias com ícones visuais (Alimentação, Cozinha, Limpeza, Banheiro, Quarto, Sala, Eletrodomésticos, Outros).
- **🛒 Filtro de Status**: Marque itens como **comprados** ou **a comprar** instantaneamente através de um checkbox interativo com animações.
- **📈 Painel de Estatísticas**:
  - Total de itens na lista.
  - Total de itens comprados vs. pendentes.
  - Estimativa financeira total dos itens com base no preço e quantidade.
- **🔍 Filtros e Busca**:
  - Busca instantânea por nome ou observações.
  - Ordenação flexível (Recentes, Antigos, Nome A-Z, Nome Z-A, Preço Crescente e Decrescente).
  - Filtro rápido por tags de categoria.
- **🌓 Modo Escuro Automático & Manual**: Alterna entre tema claro e escuro de forma fluida, preservando a escolha do usuário.
- **💾 Backup (Exportar/Importar)**: Exporte sua lista de itens em formato JSON para criar backups ou sincronizar com outros dispositivos, e importe de volta quando quiser.
- **🔔 Notificações Interativas**: Alertas visuais flutuantes (*toasts*) confirmando cada ação.

---

## 🚀 Como Executar

Como este é um projeto construído como uma **Single Page Application (SPA)** usando HTML5, Tailwind CSS e Vanilla JavaScript puro:

1. **Navegue até a pasta do projeto**:
   ```bash
   cd lista-itens-casa
   ```

2. **Abra o arquivo principal**:
   Basta abrir o arquivo `index.html` em qualquer navegador moderno de sua escolha (Chrome, Firefox, Safari, Edge):
   ```bash
   # No Windows (PowerShell)
   Start-Process "chrome" .\index.html # ou apenas dê dois cliques no arquivo index.html no Explorador de Arquivos
   ```

---

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura semântica e acessível.
- **Tailwind CSS**: Estilização moderna, responsiva e suporte nativo ao Modo Escuro.
- **Custom CSS**: Efeitos de riscar texto ao comprar, transições animadas e efeito de foco.
- **Vanilla JavaScript (ES6+)**: Manipulação de DOM, gerenciamento de estado e persistência no `localStorage`.
- **FontAwesome**: Biblioteca de ícones elegantes.
- **Google Fonts (Plus Jakarta Sans)**: Tipografia profissional de alta legibilidade.

---

## 📁 Estrutura do Projeto

```
lista-itens-casa/
├── index.html   # Interface principal e modais
├── styles.css   # Estilos adicionais e animações customizadas
├── app.js       # Logica da aplicação (CRUD, LocalStorage, Filtros, Backup)
└── README.md    # Documentação do projeto
```

---

## 💡 Informações de Segurança (Normas Corporativas)

- **Persistência Local**: Todo o armazenamento é feito via `localStorage` no seu próprio navegador. Nenhum dado é transmitido para servidores de terceiros ou armazenado na nuvem.
- **Validação de Entrada**: Todas as entradas do usuário são tratadas com segurança ao renderizar na tela para evitar ataques de injeção de script (XSS).
- **Sem Dependências Pesadas**: A aplicação utiliza apenas bibliotecas consolidadas e seguras por meio de CDNs confiáveis (Tailwind CSS, FontAwesome).
