# Integração com Google Sheets

Esta pasta contém a primeira etapa da integração do catálogo Fallout 76 com a planilha central.

## Fonte inicial

- Planilha: ID já configurado no código.
- Aba inicial: `Cópia de DumpPTBR3`.
- Cabeçalho: linha 2.
- Registros: a partir da linha 3.
- Filtro publicado pela API: somente linhas cujo `itemType` seja `WEAPON`.

A API não devolve os campos `char`, `account`, `serverHandleID`, nem o conteúdo das demais abas. Ela entrega apenas nome, quantidade, nível, efeitos lendários, negociabilidade e peso.

## Preparar o Apps Script

1. Abra a planilha no Google Sheets.
2. Acesse **Extensões → Apps Script**.
3. Substitua o conteúdo inicial pelo arquivo `Code.gs` desta pasta.
4. Salve o projeto.
5. No seletor de funções, escolha `setupF76` e execute uma vez.
6. Autorize o acesso à planilha quando o Google solicitar.
7. Clique em **Implantar → Nova implantação → Aplicativo da web**.
8. Configure **Executar como: você** e **Quem pode acessar: qualquer pessoa**.
9. Implante e copie a URL terminada em `/exec`.

A URL pública permite leitura somente dos dados filtrados no código. Não publique a planilha inteira nem habilite compartilhamento público da planilha por causa desta integração.

## Renomear abas

Na primeira execução, `setupF76()` marca a aba com metadados do próprio Google Sheets. O endpoint procura esse identificador interno, não o nome visível. Portanto, renomear a aba não quebra a conexão. Excluir a aba e criar outra exige executar uma nova configuração.

## Teste

Abra a URL de implantação seguida de `?callback=F76_TEST`. Uma resposta válida começa com `F76_TEST({"ok":true...`.

## Próxima etapa

Depois de implantar e fornecer a URL `/exec`, conectar o carregamento do catálogo do site a esse endpoint. O catálogo mestre de armas únicas continuará independente do inventário; o inventário servirá apenas para indicar posse e quantidade. As marcações pessoais continuarão armazenadas separadamente.

Para adicionar novas categorias no futuro, criaremos novos papéis de fonte e filtros explícitos, sem expor a planilha inteira.
