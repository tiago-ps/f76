# Inventário por arquivo — Fallout 76

A proposta desta etapa é separar os dados pessoais da aplicação. O inventário passa a ser um arquivo JavaScript substituível, sem API, Apps Script ou conexão obrigatória com o Google Sheets.

## Arquivo de inventário

O arquivo fica na raiz do site:

`inventario.js`

Ele define o objeto global `window.F76_INVENTARIO`, com esta estrutura:

- `schemaVersion`: versão do formato.
- `locale`: idioma dos nomes.
- `updatedAt`: data da exportação.
- `count`: quantidade de registros.
- `weapons`: lista de armas do inventário.

Cada arma contém nome, chave normalizada, quantidade, nível, estrelas, efeitos, negociabilidade e peso. Campos desconhecidos permanecem nulos ou vazios; não são deduzidos.

## Gerar o arquivo a partir da planilha

1. Baixe a planilha como arquivo Excel (.xlsx).
2. Tenha Python instalado.
3. Instale a dependência: `python -m pip install openpyxl`.
4. Execute na pasta do exportador:

   `python exportar_inventario.py caminho/para/F76.xlsx --output inventario.js`

5. Copie o arquivo gerado para a raiz do site, substituindo o `inventario.js` existente.

O exportador lê a aba completa `DumpPTBR3`, considera a linha 2 como cabeçalho e usa provisoriamente `filterFlag` 4, 5 e 6 para selecionar armas. Essa regra vem da análise do dump disponível e deve ser revista se o formato do exportador do jogo mudar.

O dump completo analisado não oferece as colunas de efeitos lendários. Por isso, `effects` permanece vazio. O script não inventa efeitos a partir dos nomes.

## Uso offline e hospedagem

O site continua podendo ser hospedado em qualquer serviço estático. O arquivo `inventario.js` deve acompanhar o site na mesma pasta de `index.html`. Para uso offline por abertura direta do arquivo, o carregamento será feito como script local, sem requisição `fetch`.

Na hospedagem, substitua somente `inventario.js` quando quiser atualizar os dados. Se o site estiver instalado como PWA, pode ser necessário fechar e abrir novamente ou limpar/atualizar o cache do navegador para obter a versão nova.

## Privacidade

O arquivo representa o inventário que o usuário escolheu exportar. Antes de compartilhar um site hospedado publicamente, confira o conteúdo do arquivo. O exportador inclui apenas campos selecionados das armas e não exporta nome de personagem, conta, identificadores de instância ou outras abas da planilha.

## Estado da integração

Este pacote define o formato do arquivo e o exportador. A interface do catálogo ainda precisa ser conectada aos campos de `window.F76_INVENTARIO` para exibir automaticamente posse e quantidades; não considere a leitura visual do inventário concluída até essa etapa ser testada na aplicação.
