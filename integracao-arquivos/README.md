# Inventário por arquivo — Fallout 76

O inventário é gerado diretamente do arquivo `itemsmod.ini` produzido pelo mod **Invent-O-Matic-Extractor**. A planilha Google Sheets/Excel não faz mais parte do fluxo de atualização.

## Gerar o inventário

O exportador está em `integracao-arquivos/exportar_inventario.py` e usa apenas Python 3, sem instalar bibliotecas adicionais.

1. Copie o `itemsmod.ini` gerado pelo mod para a pasta do exportador (ou informe o caminho completo).
2. Abra o terminal nessa pasta.
3. Execute:

   `python exportar_inventario.py itemsmod.ini --output inventario.js`

4. O arquivo `inventario.js` será criado. Copie-o para a raiz do site, substituindo o arquivo anterior.

Se o arquivo contiver mais de um personagem, informe o nome interno com `--character "Nome"`. O nome é usado apenas para selecionar os dados e não é gravado no arquivo exportado.

## Dados exportados

O formato atual usa `schemaVersion: 2` e contém:

- `records`: registros individuais, sem juntar unidades que possam ter efeitos diferentes.
- `location`: `personagem` ou `bau`.
- Nome, quantidade, nível, peso e condição de negociação.
- Estrelas lendárias e descrições de efeitos encontradas no campo `DESC` de `ItemCardEntries`.
- Dano, precisão, alcance, cadência e `filterFlag`, quando fornecidos pelo mod.

O exportador usa provisoriamente `filterFlag` 4, 5 e 6. Essa seleção corresponde à categoria de armas do mod, mas pode incluir itens utilitários ou lançáveis (por exemplo, binóculos, câmera ou explosivos). A interface deverá permitir revisar/filtrar esses casos; não se deve interpretar todo registro como arma de fogo.

Os efeitos são extraídos das primeiras linhas de `DESC`, em quantidade correspondente às estrelas. Linhas posteriores são mantidas em `description`, mas não classificadas automaticamente como efeitos lendários. Quando o mod não fornece `DESC`, `effects` fica vazio; o script não inventa efeitos.

## Privacidade

O arquivo exportado **não inclui** nome da conta, nome do personagem, `serverHandleID`, `containerID` ou o conteúdo bruto do arquivo do mod. Apenas os campos explicitamente selecionados são gravados.

O `itemsmod.ini` original permanece no computador do usuário. Não publique esse arquivo bruto. Para publicar o inventário, revise o `inventario.js` gerado e compartilhe apenas se desejar tornar públicos os itens e quantidades.

## Hospedagem e uso offline

O `inventario.js` fica na raiz do site, ao lado de `index.html`. Para atualizar, substitua somente esse arquivo. O site pode ser hospedado em qualquer serviço estático; o arquivo também pode acompanhar uma cópia local do site.

A integração da interface do catálogo com os registros ainda precisa ser concluída e testada. O exportador já gera os dados, mas isso não significa que a aplicação já exiba automaticamente a posse dos itens. No PWA hospedado, o service worker consulta a rede para `inventario.js` a cada carregamento e mantém a última cópia válida para uso offline; assim, a atualização dos dados não exige alterar a versão do service worker.

## Painel visual

A aplicação carrega `inventario-ui.js` após abrir o catálogo. O painel independente consulta `window.F76_INVENTARIO.records`, permite busca por nome/descrição dos efeitos e filtra por personagem ou baú. O arquivo também é incluído no cache inicial do PWA. O painel não modifica o catálogo compactado.

**Atenção:** publicar um `inventario.js` preenchido torna os dados nele contidos acessíveis aos visitantes do site. O modelo vazio do repositório não contém inventário pessoal; revise o arquivo gerado antes de substituí-lo ou publicá-lo.
