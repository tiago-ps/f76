# Integração com Google Sheets

Esta pasta contém a primeira etapa da integração do catálogo Fallout 76 com a planilha central.

## Fonte inicial

- Planilha: ID já configurado no código.
- Aba de origem: `DumpPTBR3` completa.
- Cabeçalho: linha 2.
- Registros: a partir da linha 3.
- Idioma de referência: português brasileiro (PT-BR).
- Filtro publicado pela API: registros com `filterFlag` igual a `4`, `5` ou `6`.

A aba completa não possui a coluna `itemType`. Por isso, a classificação inicial usa `filterFlag`. Os valores 4, 5 e 6 foram cruzados com os registros identificados como `WEAPON` na aba simplificada `Cópia de DumpPTBR3`. No arquivo analisado, os 311 registros com esses valores também apresentam atributos de arma. Essa regra deverá ser revista se futuras versões do exportador alterarem os valores.

A API entrega somente nome, chave normalizada, quantidade, nível, estrelas lendárias, negociabilidade e peso. O campo `effects` permanece como lista vazia nesta etapa: a aba completa não possui as colunas `legendary_1` a `legendary_4` existentes na cópia simplificada. Não inferimos efeitos a partir do nome.

A API não devolve `char`, `account`, `serverHandleID`, nem o conteúdo das outras abas.

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
