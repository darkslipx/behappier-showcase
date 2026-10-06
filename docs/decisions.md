# Decisões de engenharia

Registros curtos de escolhas que eu fiz e por quê. Cada uma veio de uma necessidade real de construir para uma pessoa específica: a Amalia, minha namorada.

## 1. Primeiro no celular, nuvem opcional
Os check-ins são gravados primeiro no celular e espelhados no Firestore depois. O app nunca mostra carregando pra salvar um check-in, funciona no modo avião e com internet ruim, e o login num celular novo junta os dois lados pelo id. O custo é uma sincronização simples em que a última gravação vence, o que basta para uma usuária em um ou dois aparelhos.

## 2. A chave da IA nunca chega no app
Toda funcionalidade de IA é uma Cloud Function chamada com `httpsCallable`, e cada uma confere se quem chamou está logado. Colocar a chave no app deixaria qualquer pessoa que descompactasse o APK gastar com ela.

## 3. Contas só pelo console, e apagar mantém a conta
Não existe tela de cadastro: eu crio a conta, então um APK vazado não consegue criar usuários que gastam o orçamento da IA. Por isso, "apagar todos os meus registros" apaga os dados (celular, Firestore e Storage) mas mantém a conta; senão ela ficaria trancada pra fora.

## 4. Dois modelos para dois trabalhos
O chat de apoio e as sugestões pós check-in usam um modelo pequeno e barato, com pouco contexto. A tutora de estudos usa um modelo que lê imagens e tem uma janela de contexto enorme, porque recebe PDFs e slides inteiros. Nenhum dos dois lê arquivo do Office nem PDF direto, então o texto é extraído no servidor (pdf-parse, mammoth e um leitor pequeno de `.pptx`).

## 5. PDF gerado no celular
Quando ela pede um PDF de estudo, o modelo devolve texto estruturado (seções com `## ` e tópicos com `• `) e o app monta o PDF com `expo-print` e um modelo HTML estilizado. Gerar o PDF não gasta token de IA, funciona offline depois que o texto existe e mantém o visual sempre igual.

## 6. Conversas de estudo ficam no celular, pastas vão pra nuvem
O histórico do chat com as fotos é pessoal e descartável, então fica no aparelho. O material das pastas é o contrário: é o que ela precisa na época de prova e tem que sobreviver a um celular perdido, então fica no Firebase Storage com os dados no Firestore.

## 7. O servidor lê os arquivos da pasta sozinho
No "perguntar pra IA sobre estes itens" o app manda só os ids. A função baixa os arquivos do Storage, extrai o texto uma vez e guarda por item. Assim as requisições ficam pequenas no 4G, os PDFs grandes não estouram o limite da callable e as perguntas seguintes saem baratas.

## 8. Avisar o que a IA não conseguiu usar
PDF escaneado não tem camada de texto, áudio não é transcrito nas pastas e uma pasta enorme não cabe numa requisição. Em vez de responder como se tivesse lido tudo, a função devolve um aviso ("não consegui ler X", "ficou de fora Y") que o app mostra em cima da conversa.

## 9. As preferências dela valem no código, não só no prompt
"Sem travessão" está em todo prompt de sistema, e toda resposta ainda passa por um filtro determinístico, porque os modelos não seguem instrução de estilo 100% das vezes. A mesma ideia vale para os textos do app: nada de linguagem de produtividade, nada de faixa alarmante.

## 10. APK instalado por link em vez de loja
Uma usuária não justifica publicar na loja e passar por revisão. O APK é compilado localmente com o Gradle (a fila de build na nuvem chegava a uma hora) e enviado por link privado. Manter uma única chave de assinatura importa: um APK assinado com outra chave não atualiza o app instalado.

## 11. Compartilhar do Android em vez de integrar com o WhatsApp
O material chega em grupos do WhatsApp. Em vez de integrar com o WhatsApp, o app se registra como destino no menu Compartilhar do Android (`expo-share-intent`), o que funciona para WhatsApp, galeria, Drive e qualquer outro app, sem nenhum backend.
