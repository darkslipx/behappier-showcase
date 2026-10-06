# Arquitetura

## Organização dos dados

Tudo pertence a um usuário do Firebase e fica dentro do uid dele, então uma única regra de segurança (`request.auth.uid == userId`) protege tudo.

```
Firestore
  users/{uid}                              perfil
  users/{uid}/meta/cycle                   ciclo atual + histórico de inícios da menstruação
  users/{uid}/logs/{logId}                 check-ins
  users/{uid}/symptoms/{data}              fluxo e sintomas por dia
  users/{uid}/folders/{pastaId}            pasta de matéria (nome, cor, ícone, contagem de itens)
  users/{uid}/folders/{pastaId}/items/{id}    foto, arquivo ou anotação
  users/{uid}/folders/{pastaId}/texts/{id}    texto extraído pela função de IA (cache)

Storage
  users/{uid}/folders/{pastaId}/{itemId}.{ext}   os arquivos em si (máximo 50 MB cada)

Celular (AsyncStorage + pasta de documentos do app)
  perfil, check-ins, ciclo, sintomas       fonte da verdade offline, espelhada no Firestore
  chat de apoio e conversas de estudo      só no celular, com as fotos e PDFs delas
  cache dos arquivos de pasta já abertos   pra segunda abertura ser instantânea
```

## Do check-in à sugestão

```mermaid
sequenceDiagram
  participant U as Usuária
  participant A as App
  participant L as AsyncStorage
  participant F as Firestore
  participant C as aiSuggestion
  U->>A: energia, fatores, humor, nota
  A->>L: salva na hora (funciona offline)
  A-->>F: espelha o check-in (se estiver logada)
  A->>C: check-in + resumo curto dos últimos dias e da fase do ciclo
  C->>C: confere se a usuária está logada
  C-->>A: uma sugestão gentil e concreta
  A->>U: sugestão + "conversar sobre isso" abre o chat já com ela
```

## Pastas de matéria e compartilhar do WhatsApp

```mermaid
sequenceDiagram
  participant W as WhatsApp
  participant A as App
  participant S as Storage
  participant F as Firestore
  W->>A: Compartilhar → app (intent SEND do Android, arquivo copiado pro cache do app)
  A->>A: espera o login e abre "Salvar numa pasta"
  A->>S: uploadBytesResumable (barra de progresso)
  A->>F: batch: cria o item + incrementa a contagem da pasta
  Note over A,S: se gravar o item falhar, o arquivo enviado é apagado
  F-->>A: onSnapshot atualiza a tela da pasta ao vivo
```

## "Perguntar pra IA" sobre itens escolhidos

```mermaid
sequenceDiagram
  participant A as App
  participant C as aiStudyChat
  participant F as Firestore
  participant S as Storage
  participant O as OpenAI
  A->>C: conversa + { pastaId, itemIds }
  C->>F: lê a pasta e os itens escolhidos (dentro do uid de quem chamou)
  loop cada item, do mais recente pro mais antigo
    alt anotação
      C->>C: usa o texto dela
    else PDF / Word / PPTX / texto
      C->>F: texts/{id} já existe?
      opt não existe
        C->>S: baixa o arquivo
        C->>C: extrai (pdf-parse, mammoth, leitor de slides)
        C->>F: guarda o texto (vazio pra PDF escaneado, pra não tentar de novo)
      end
    else foto
      C->>S: baixa e anexa como imagem (máximo 10)
    end
  end
  C->>O: prompt do sistema + mensagem com o material + conversa
  O-->>C: JSON { reply, document? }
  C-->>A: resposta, conteúdo de PDF opcional, aviso do que ficou de fora
  A->>A: gera o PDF no celular se ela pediu
```

O material é montado de novo a cada pergunta a partir do cache, então o celular nunca reenvia arquivos e a IA não "esquece" o material quando a conversa cresce.

## Por que toda funcionalidade de IA é uma callable

A chave da OpenAI é um secret do Firebase, disponível só para as funções. O app chama as funções com `httpsCallable`, que envia o token de identidade da usuária, e cada função recusa chamadas sem login antes de fazer qualquer coisa. Não existe tela de cadastro, então as únicas contas são as criadas no console.
