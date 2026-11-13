// Replybek chat widget. Usage:
//   <script src=".../replybek-widget.js" data-key="pk_…" data-api="https://api.example.com" defer></script>
// Optional: data-language="uz|ru|en"; data-launcher="none" hides the floating button, and the page
// opens the chat with window.Replybek.open() (also .close(), .toggle()) after "replybek:ready".
// window.Replybek.identify({ user_id, name, email, phone, avatar, company: { id, name, plan,
// website }, attributes: { … } }) tells the team who a signed-in visitor is; .reset() forgets the chat
// on sign-out; the "replybek:unread" event ({ detail: { count } }) feeds a page's own badge.
// Everything renders inside a shadow root, so the host page's CSS can't affect it (and vice versa).
// Visitor text is only ever inserted with textContent, never as HTML.
import css from "./widget.css?inline";

(function () {
  const script = document.currentScript || document.querySelector('script[data-key][src*="replybek-widget"]') || document.querySelector("script[data-replybek-key]");
  const KEY = script && (script.dataset.key || script.dataset.replybekKey);
  const API = script && (script.dataset.api || "").replace(/\/$/, "");
  const LANGUAGE = String(script?.dataset.language || document.documentElement.lang || navigator.language || "en").trim().toLowerCase().split(/[-_]/)[0] || "en";
  if (!KEY || !API) return console.warn("[Replybek] Add data-key and data-api to the widget script tag.");
  if (window.__replybekWidget) return; // pasted twice
  window.__replybekWidget = true;
  // When loaded inside the business system's own page (data-inpage), the widget can run the AI's
  // tool requests here, with the user's own session. INPAGE is the origin those requests go to.
  const INPAGE = script && (script.dataset.inpage !== undefined) ? location.origin : null;
  // data-launcher="none": no floating button; the page opens the chat itself with window.Replybek.open().
  const NO_LAUNCHER = script?.dataset.launcher === "none";

  // ───── Words ─────
  // The widget speaks the page's language when it's one we have; English otherwise.
  const STRINGS = {
    en: {
      open: "Open chat", chat: "Chat", chatWith: "Chat with {name}", minimize: "Minimize chat",
      ask: "Ask a question", message: "Message", send: "Send message",
      person: "Talk to a person", wantPerson: "I'd like to talk to a person.", newChat: "Start a new chat",
      powered: "Powered by Replybek",
      note: "Answers are written by AI from this business's information. A person can help if you need one.",
      sources: { one: "{count} source used", other: "{count} sources used" },
      signInTo: "Sign in to {name}", signInNote: "You'll sign in on their page. Your password isn't shared with this chat.", signIn: "Sign in",
      pleaseConfirm: "Please confirm", confirm: "Confirm", cancel: "Cancel",
      confirmed: "Confirmed", cancelled: "Cancelled", failed: "Didn't go through",
      team: "{name} team", typing: "AI agent is typing", teamTyping: "{name} is typing",
      steps: { search: "Looking through our help docs…", tool: "Checking our system…", confirm: "Preparing the change for you to confirm…", writing: "Writing the answer…" },
      handoff: "A teammate has been asked to join. They'll reply here; you can keep this page open or come back later.",
      replying: "A teammate is replying", waiting: "Waiting for the team", agent: "{name} · AI agent",
      errSend: "Couldn't send your message. Check your connection and try again.",
      errExpired: "This chat expired. Please send your message again.",
      wrong: "Something went wrong.",
      attach: "Attach a file", removeFile: "Remove file", photo: "Photo", openPhoto: "Open photo", download: "Download {name}",
      fileTooBig: "Files can be up to 10 MB.", fileType: "Send a photo, a PDF or a document (TXT, CSV, DOCX, XLSX).",
      kb: "{n} KB", mb: "{n} MB",
    },
    uz: {
      open: "Chatni ochish", chat: "Chat", chatWith: "{name} bilan chat", minimize: "Chatni yigʻish",
      ask: "Savol bering", message: "Xabar", send: "Yuborish",
      person: "Xodim bilan gaplashish", wantPerson: "Xodim bilan gaplashmoqchiman.", newChat: "Yangi chat boshlash",
      powered: "Replybek asosida",
      note: "Javoblarni AI shu biznes maʼlumotlari asosida yozadi. Kerak boʻlsa, xodim yordam beradi.",
      sources: { other: "{count} ta manba ishlatildi" },
      signInTo: "{name} tizimiga kirish", signInNote: "Ularning sahifasida kirasiz. Parolingiz bu chatga berilmaydi.", signIn: "Kirish",
      pleaseConfirm: "Tasdiqlang", confirm: "Tasdiqlash", cancel: "Bekor qilish",
      confirmed: "Tasdiqlandi", cancelled: "Bekor qilindi", failed: "Amalga oshmadi",
      team: "{name} jamoasi", typing: "AI agent yozmoqda", teamTyping: "{name} yozmoqda",
      steps: { search: "Maʼlumotlarni qidiryapman…", tool: "Bazadan tekshiryapman…", confirm: "Tasdiqlash uchun tayyorlayapman…", writing: "Javob tayyorlayapman…" },
      handoff: "Xodimga xabar berildi. U shu yerda javob beradi: sahifani ochiq qoldirishingiz yoki keyinroq qaytishingiz mumkin.",
      replying: "Xodim javob bermoqda", waiting: "Jamoa kutilmoqda", agent: "{name} · AI agent",
      errSend: "Xabar yuborilmadi. Internetni tekshirib, qayta urinib koʻring.",
      errExpired: "Bu chat muddati tugadi. Xabaringizni qayta yuboring.",
      wrong: "Nimadir xato ketdi.",
      attach: "Fayl biriktirish", removeFile: "Faylni olib tashlash", photo: "Rasm", openPhoto: "Rasmni ochish", download: "{name} faylini yuklab olish",
      fileTooBig: "Fayl hajmi 10 MB dan oshmasin.", fileType: "Rasm, PDF yoki hujjat yuboring (TXT, CSV, DOCX, XLSX).",
      kb: "{n} KB", mb: "{n} MB",
    },
    ru: {
      open: "Открыть чат", chat: "Чат", chatWith: "Чат с {name}", minimize: "Свернуть чат",
      ask: "Задайте вопрос", message: "Сообщение", send: "Отправить",
      person: "Связаться с сотрудником", wantPerson: "Хочу поговорить с сотрудником.", newChat: "Начать новый чат",
      powered: "Работает на Replybek",
      note: "Ответы пишет ИИ по информации этой компании. Если нужно, поможет сотрудник.",
      sources: { one: "Использован {count} источник", few: "Использовано {count} источника", many: "Использовано {count} источников", other: "Использовано {count} источника" },
      signInTo: "Вход в {name}", signInNote: "Вы войдёте на их странице. Пароль не передаётся в этот чат.", signIn: "Войти",
      pleaseConfirm: "Подтвердите", confirm: "Подтвердить", cancel: "Отмена",
      confirmed: "Подтверждено", cancelled: "Отменено", failed: "Не получилось",
      team: "Команда {name}", typing: "ИИ-агент печатает", teamTyping: "{name} печатает",
      steps: { search: "Ищу в базе знаний…", tool: "Проверяю в базе…", confirm: "Готовлю изменение на подтверждение…", writing: "Готовлю ответ…" },
      handoff: "Мы позвали сотрудника. Он ответит здесь: можно оставить страницу открытой или вернуться позже.",
      replying: "Отвечает сотрудник", waiting: "Ждём команду", agent: "{name} · ИИ-агент",
      errSend: "Не удалось отправить сообщение. Проверьте интернет и попробуйте ещё раз.",
      errExpired: "Этот чат устарел. Отправьте сообщение ещё раз.",
      wrong: "Что-то пошло не так.",
      attach: "Прикрепить файл", removeFile: "Убрать файл", photo: "Фото", openPhoto: "Открыть фото", download: "Скачать {name}",
      fileTooBig: "Файл должен быть не больше 10 МБ.", fileType: "Отправьте фото, PDF или документ (TXT, CSV, DOCX, XLSX).",
      kb: "{n} КБ", mb: "{n} МБ",
    },
    es: {
      open: "Abrir chat", chat: "Chat", chatWith: "Chatear con {name}", minimize: "Minimizar chat",
      ask: "Haga una pregunta", message: "Mensaje", send: "Enviar mensaje",
      person: "Hablar con una persona", wantPerson: "Me gustaría hablar con una persona.", newChat: "Iniciar un nuevo chat",
      powered: "Con la tecnología de Replybek",
      note: "Las respuestas las escribe la IA a partir de la información de este negocio. Si lo necesita, una persona puede ayudarle.",
      sources: { one: "{count} fuente utilizada", many: "{count} de fuentes utilizadas", other: "{count} fuentes utilizadas" },
      signInTo: "Iniciar sesión en {name}", signInNote: "Iniciará sesión en la página del negocio. Su contraseña no se comparte con este chat.", signIn: "Iniciar sesión",
      pleaseConfirm: "Confirme, por favor", confirm: "Confirmar", cancel: "Cancelar",
      confirmed: "Confirmado", cancelled: "Cancelado", failed: "No se pudo completar",
      team: "Equipo de {name}", typing: "El agente de IA está escribiendo", teamTyping: "{name} está escribiendo",
      steps: { search: "Buscando en nuestra documentación de ayuda…", tool: "Consultando nuestro sistema…", confirm: "Preparando el cambio para que lo confirme…", writing: "Redactando la respuesta…" },
      handoff: "Hemos pedido a un miembro del equipo que se una. Le responderá aquí. Puede mantener esta página abierta o volver más tarde.",
      replying: "Un miembro del equipo está respondiendo", waiting: "Esperando al equipo", agent: "{name} · agente de IA",
      errSend: "No se pudo enviar su mensaje. Compruebe su conexión e inténtelo de nuevo.",
      errExpired: "Este chat ha caducado. Envíe su mensaje de nuevo.",
      wrong: "Algo salió mal.",
      attach: "Adjuntar un archivo", removeFile: "Quitar archivo", photo: "Foto", openPhoto: "Abrir foto", download: "Descargar {name}",
      fileTooBig: "Los archivos pueden tener hasta 10 MB.", fileType: "Envíe una foto, un PDF o un documento (TXT, CSV, DOCX, XLSX).",
      kb: "{n} KB", mb: "{n} MB",
    },
    pt: {
      open: "Abrir chat", chat: "Chat", chatWith: "Conversar com {name}", minimize: "Minimizar chat",
      ask: "Faça uma pergunta", message: "Mensagem", send: "Enviar mensagem",
      person: "Falar com uma pessoa", wantPerson: "Gostaria de falar com uma pessoa.", newChat: "Iniciar uma nova conversa",
      powered: "Com tecnologia Replybek",
      note: "As respostas são escritas por IA com base nas informações desta empresa. Se precisar, uma pessoa pode ajudar.",
      sources: { one: "{count} fonte utilizada", many: "{count} de fontes utilizadas", other: "{count} fontes utilizadas" },
      signInTo: "Iniciar sessão em {name}", signInNote: "O início de sessão é feito na página da empresa. Os seus dados de acesso não são enviados para este chat.", signIn: "Iniciar sessão",
      pleaseConfirm: "Confirme, por favor", confirm: "Confirmar", cancel: "Cancelar",
      confirmed: "Confirmado", cancelled: "Cancelado", failed: "Não foi possível concluir",
      team: "Suporte {name}", typing: "O agente de IA escreve uma resposta", teamTyping: "{name} escreve uma resposta",
      steps: { search: "Pesquisa na nossa documentação de ajuda…", tool: "Verificação no nosso sistema…", confirm: "Preparação da alteração para a sua confirmação…", writing: "Redação da resposta…" },
      handoff: "Pedimos a um colaborador que se junte à conversa. A resposta chegará aqui. Pode manter esta página aberta ou voltar mais tarde.",
      replying: "Resposta de um colaborador a caminho", waiting: "À espera do suporte", agent: "{name} · agente de IA",
      errSend: "Não foi possível enviar a mensagem. Verifique a conexão e tente novamente.",
      errExpired: "Esta conversa expirou. Envie a mensagem novamente.",
      wrong: "Ocorreu um erro.",
      attach: "Adicionar anexo", removeFile: "Remover anexo", photo: "Foto", openPhoto: "Abrir foto", download: "Fazer download de {name}",
      fileTooBig: "Os anexos podem ter até 10 MB.", fileType: "Envie uma foto, um PDF ou um documento (TXT, CSV, DOCX, XLSX).",
      kb: "{n} KB", mb: "{n} MB",
    },
    fr: {
      open: "Ouvrir le chat", chat: "Chat", chatWith: "Discuter avec {name}", minimize: "Réduire le chat",
      ask: "Posez une question", message: "Message", send: "Envoyer le message",
      person: "Parler à une personne", wantPerson: "Je souhaite parler à une personne.", newChat: "Démarrer une nouvelle conversation",
      powered: "Propulsé par Replybek",
      note: "Les réponses sont rédigées par une IA à partir des informations de cette entreprise. Une personne peut vous aider si besoin.",
      sources: { one: "{count} source utilisée", many: "{count} de sources utilisées", other: "{count} sources utilisées" },
      signInTo: "Se connecter à {name}", signInNote: "Vous vous connecterez sur la page de l’entreprise. Votre mot de passe n’est pas partagé avec ce chat.", signIn: "Se connecter",
      pleaseConfirm: "Veuillez confirmer", confirm: "Confirmer", cancel: "Annuler",
      confirmed: "Confirmé", cancelled: "Annulé", failed: "L’opération n’a pas abouti",
      team: "Équipe {name}", typing: "L’agent IA est en train d’écrire", teamTyping: "{name} est en train d’écrire",
      steps: { search: "Recherche dans notre documentation d’aide…", tool: "Vérification dans notre système…", confirm: "Préparation de la modification à confirmer…", writing: "Rédaction de la réponse…" },
      handoff: "Un membre de l’équipe a été invité à rejoindre la conversation. Il vous répondra ici. Vous pouvez garder cette page ouverte ou revenir plus tard.",
      replying: "Un membre de l’équipe répond", waiting: "En attente de l’équipe", agent: "{name} · agent IA",
      errSend: "Impossible d’envoyer votre message. Vérifiez votre connexion et réessayez.",
      errExpired: "Cette conversation a expiré. Veuillez renvoyer votre message.",
      wrong: "Une erreur s’est produite.",
      attach: "Joindre un fichier", removeFile: "Retirer le fichier", photo: "Photo", openPhoto: "Ouvrir la photo", download: "Télécharger {name}",
      fileTooBig: "Les fichiers peuvent faire jusqu’à 10 Mo.", fileType: "Envoyez une photo, un PDF ou un document (TXT, CSV, DOCX, XLSX).",
      kb: "{n} Ko", mb: "{n} Mo",
    },
    it: {
      open: "Apri la chat", chat: "Chat", chatWith: "Chatta con {name}", minimize: "Riduci la chat",
      ask: "Scriva una domanda", message: "Messaggio", send: "Invia messaggio",
      person: "Parlare con una persona", wantPerson: "Vorrei parlare con una persona.", newChat: "Avvia una nuova chat",
      powered: "Con tecnologia Replybek",
      note: "Le risposte sono scritte dall’IA in base alle informazioni di questa attività. Se ne ha bisogno, una persona può aiutarla.",
      sources: { one: "{count} fonte utilizzata", many: "{count} di fonti utilizzate", other: "{count} fonti utilizzate" },
      signInTo: "Accedi a {name}", signInNote: "L’accesso avviene sulla pagina dell’attività. La sua password non viene condivisa con questa chat.", signIn: "Accedi",
      pleaseConfirm: "Confermi, per favore", confirm: "Conferma", cancel: "Annulla",
      confirmed: "Confermato", cancelled: "Annullato", failed: "Operazione non riuscita",
      team: "Team {name}", typing: "L’agente IA sta scrivendo", teamTyping: "{name} sta scrivendo",
      steps: { search: "Ricerca nella nostra documentazione di supporto…", tool: "Verifica nel nostro sistema…", confirm: "Preparazione della modifica da confermare…", writing: "Scrittura della risposta…" },
      handoff: "Abbiamo chiesto a un membro del team di unirsi. Risponderà qui. Può tenere aperta questa pagina o tornare più tardi.",
      replying: "Un membro del team sta rispondendo", waiting: "In attesa del team", agent: "{name} · agente IA",
      errSend: "Impossibile inviare il messaggio. Controlli la connessione e riprovi.",
      errExpired: "Questa chat è scaduta. Invii di nuovo il messaggio.",
      wrong: "Si è verificato un errore.",
      attach: "Allega un file", removeFile: "Rimuovi file", photo: "Foto", openPhoto: "Apri foto", download: "Scarica {name}",
      fileTooBig: "I file possono pesare fino a 10 MB.", fileType: "Invii una foto, un PDF o un documento (TXT, CSV, DOCX, XLSX).",
      kb: "{n} KB", mb: "{n} MB",
    },
    de: {
      open: "Chat öffnen", chat: "Chat", chatWith: "Chat mit {name}", minimize: "Chat minimieren",
      ask: "Stellen Sie eine Frage", message: "Nachricht", send: "Nachricht senden",
      person: "Mit einer Person sprechen", wantPerson: "Ich möchte gern mit einer Person sprechen.", newChat: "Neuen Chat starten",
      powered: "Bereitgestellt von Replybek",
      note: "Die Antworten werden von KI auf Grundlage der Informationen dieses Unternehmens verfasst. Bei Bedarf hilft Ihnen gern eine Person weiter.",
      sources: { one: "{count} Quelle verwendet", other: "{count} Quellen verwendet" },
      signInTo: "Bei {name} anmelden", signInNote: "Sie melden sich auf der Seite des Unternehmens an. Ihr Passwort wird nicht mit diesem Chat geteilt.", signIn: "Anmelden",
      pleaseConfirm: "Bitte bestätigen", confirm: "Bestätigen", cancel: "Abbrechen",
      confirmed: "Bestätigt", cancelled: "Abgebrochen", failed: "Fehlgeschlagen",
      team: "Team {name}", typing: "Der KI-Agent schreibt", teamTyping: "{name} schreibt",
      steps: { search: "Unsere Hilfedokumente werden durchsucht…", tool: "Wird in unserem System nachgesehen…", confirm: "Die Änderung wird zur Bestätigung vorbereitet…", writing: "Die Antwort wird verfasst…" },
      handoff: "Ein Teammitglied wurde hinzugebeten. Die Antwort erscheint hier. Sie können diese Seite geöffnet lassen oder später zurückkommen.",
      replying: "Ein Teammitglied antwortet", waiting: "Warten auf das Team", agent: "{name} · KI-Agent",
      errSend: "Ihre Nachricht konnte nicht gesendet werden. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
      errExpired: "Dieser Chat ist abgelaufen. Bitte senden Sie Ihre Nachricht erneut.",
      wrong: "Etwas ist schiefgelaufen.",
      attach: "Datei anhängen", removeFile: "Datei entfernen", photo: "Foto", openPhoto: "Foto öffnen", download: "{name} herunterladen",
      fileTooBig: "Dateien dürfen bis zu 10 MB groß sein.", fileType: "Senden Sie ein Foto, eine PDF-Datei oder ein Dokument (TXT, CSV, DOCX, XLSX).",
      kb: "{n} KB", mb: "{n} MB",
    },
    ja: {
      open: "チャットを開く", chat: "チャット", chatWith: "{name}とチャット", minimize: "チャットを最小化",
      ask: "質問を入力してください", message: "メッセージ", send: "メッセージを送信",
      person: "担当者と話す", wantPerson: "担当者と話したいです。", newChat: "新しいチャットを始める",
      powered: "Replybek提供",
      note: "回答は、この事業者の情報をもとにAIが作成しています。必要な場合は担当者がお手伝いします。",
      sources: { other: "{count}件の情報源を使用" },
      signInTo: "{name}にサインイン", signInNote: "サインインは事業者のページで行います。パスワードがこのチャットに共有されることはありません。", signIn: "サインイン",
      pleaseConfirm: "ご確認ください", confirm: "確定する", cancel: "キャンセル",
      confirmed: "確定しました", cancelled: "キャンセルしました", failed: "完了できませんでした",
      team: "{name}チーム", typing: "AIエージェントが入力中です", teamTyping: "{name}が入力中です",
      steps: { search: "ヘルプ記事を確認しています…", tool: "システムで確認しています…", confirm: "確認用の変更内容を準備しています…", writing: "回答を作成しています…" },
      handoff: "担当者に参加を依頼しました。返信はこちらに届きます。このページを開いたままにするか、後でもう一度アクセスしてください。",
      replying: "担当者が返信中です", waiting: "担当者を待っています", agent: "{name} · AIエージェント",
      errSend: "メッセージを送信できませんでした。接続を確認して、もう一度お試しください。",
      errExpired: "このチャットは期限切れになりました。もう一度メッセージを送信してください。",
      wrong: "問題が発生しました。",
      attach: "ファイルを添付", removeFile: "ファイルを削除", photo: "写真", openPhoto: "写真を開く", download: "{name}をダウンロード",
      fileTooBig: "ファイルは10 MBまで送信できます。", fileType: "写真、PDF、またはドキュメント（TXT, CSV, DOCX, XLSX）を送信してください。",
      kb: "{n} KB", mb: "{n} MB",
    },
    ko: {
      open: "채팅 열기", chat: "채팅", chatWith: "{name} 채팅", minimize: "채팅 최소화",
      ask: "질문을 입력하세요", message: "메시지", send: "메시지 보내기",
      person: "상담원과 대화하기", wantPerson: "상담원과 이야기하고 싶어요.", newChat: "새 채팅 시작하기",
      powered: "Replybek 제공",
      note: "답변은 이 업체의 정보를 바탕으로 AI가 작성해요. 필요하면 상담원이 도와드려요.",
      sources: { other: "출처 {count}개 사용" },
      signInTo: "{name}에 로그인", signInNote: "로그인은 업체 페이지에서 진행돼요. 비밀번호는 이 채팅에 공유되지 않아요.", signIn: "로그인",
      pleaseConfirm: "확인해 주세요", confirm: "확인", cancel: "취소",
      confirmed: "확인됨", cancelled: "취소됨", failed: "처리되지 않았어요",
      team: "{name} 팀", typing: "AI 에이전트가 입력 중이에요", teamTyping: "{name} 님이 입력 중이에요",
      steps: { search: "도움말 문서를 살펴보고 있어요…", tool: "시스템에서 확인하고 있어요…", confirm: "확인하실 변경 사항을 준비하고 있어요…", writing: "답변을 작성하고 있어요…" },
      handoff: "상담원에게 참여를 요청했어요. 답변은 여기에 표시돼요. 이 페이지를 열어 두거나 나중에 다시 오셔도 돼요.",
      replying: "상담원이 답변하고 있어요", waiting: "상담원을 기다리고 있어요", agent: "{name} · AI 에이전트",
      errSend: "메시지를 보내지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.",
      errExpired: "이 채팅이 만료되었어요. 메시지를 다시 보내 주세요.",
      wrong: "문제가 발생했어요.",
      attach: "파일 첨부", removeFile: "파일 삭제", photo: "사진", openPhoto: "사진 열기", download: "{name} 다운로드",
      fileTooBig: "파일은 최대 10 MB까지 보낼 수 있어요.", fileType: "사진, PDF 또는 문서(TXT, CSV, DOCX, XLSX)를 보내 주세요.",
      kb: "{n} KB", mb: "{n} MB",
    },
    zh: {
      open: "打开聊天", chat: "聊天", chatWith: "与{name}聊天", minimize: "最小化聊天",
      ask: "请输入问题", message: "消息", send: "发送消息",
      person: "联系人工客服", wantPerson: "我想和人工客服沟通。", newChat: "开始新的对话",
      powered: "由 Replybek 提供支持",
      note: "回答由 AI 根据该商家的信息生成。如有需要，可以转人工客服。",
      sources: { other: "已参考 {count} 个来源" },
      signInTo: "登录{name}", signInNote: "您将在该商家的页面登录。您的密码不会共享给此聊天。", signIn: "登录",
      pleaseConfirm: "请确认", confirm: "确认", cancel: "取消",
      confirmed: "已确认", cancelled: "已取消", failed: "未能完成",
      team: "{name}团队", typing: "AI 智能体正在输入", teamTyping: "{name}正在输入",
      steps: { search: "正在查阅帮助文档…", tool: "正在查询系统…", confirm: "正在准备待您确认的更改…", writing: "正在撰写回答…" },
      handoff: "已邀请一位团队成员加入。对方会在这里回复，您可以保持此页面打开，也可以稍后再来。",
      replying: "团队成员正在回复", waiting: "正在等待团队回复", agent: "{name} · AI 智能体",
      errSend: "消息发送失败。请检查网络连接后重试。",
      errExpired: "此对话已过期。请重新发送消息。",
      wrong: "出了点问题。",
      attach: "添加附件", removeFile: "移除文件", photo: "照片", openPhoto: "打开照片", download: "下载{name}",
      fileTooBig: "文件大小不能超过 10 MB。", fileType: "请发送照片、PDF 或文档（TXT, CSV, DOCX, XLSX）。",
      kb: "{n} KB", mb: "{n} MB",
    },
    ar: {
      open: "فتح المحادثة", chat: "محادثة", chatWith: "محادثة مع {name}", minimize: "تصغير المحادثة",
      ask: "اطرح سؤالًا", message: "رسالة", send: "إرسال الرسالة",
      person: "التحدث مع أحد الموظفين", wantPerson: "أرغب في التحدث مع أحد الموظفين.", newChat: "بدء محادثة جديدة",
      powered: "بدعم من Replybek",
      note: "تُكتب الإجابات بالذكاء الاصطناعي استنادًا إلى معلومات هذه الشركة. يمكن لأحد الموظفين مساعدتك عند الحاجة.",
      sources: { zero: "{count} مصدر مستخدم", one: "{count} مصدر مستخدم", two: "{count} مصدر مستخدم", few: "{count} مصادر مستخدمة", many: "{count} مصدرًا مستخدمًا", other: "{count} مصدر مستخدم" },
      signInTo: "تسجيل الدخول إلى {name}", signInNote: "ستسجّل الدخول من صفحة الشركة. لا تتم مشاركة كلمة المرور مع هذه المحادثة.", signIn: "تسجيل الدخول",
      pleaseConfirm: "يُرجى التأكيد", confirm: "تأكيد", cancel: "إلغاء",
      confirmed: "تم التأكيد", cancelled: "تم الإلغاء", failed: "لم تتم العملية",
      team: "فريق {name}", typing: "وكيل الذكاء الاصطناعي يكتب", teamTyping: "{name} يكتب",
      steps: { search: "جارٍ البحث في مستندات المساعدة…", tool: "جارٍ التحقق في نظامنا…", confirm: "جارٍ تجهيز التغيير لتأكيده…", writing: "جارٍ كتابة الإجابة…" },
      handoff: "طلبنا من أحد أعضاء الفريق الانضمام. سيرد عليك هنا، ويمكنك إبقاء هذه الصفحة مفتوحة أو العودة لاحقًا.",
      replying: "أحد أعضاء الفريق يكتب الرد", waiting: "في انتظار الفريق", agent: "{name} · وكيل ذكاء اصطناعي",
      errSend: "تعذّر إرسال رسالتك. تحقق من اتصالك وحاول مرة أخرى.",
      errExpired: "انتهت صلاحية هذه المحادثة. يُرجى إرسال رسالتك مرة أخرى.",
      wrong: "حدث خطأ ما.",
      attach: "إرفاق ملف", removeFile: "إزالة الملف", photo: "صورة", openPhoto: "فتح الصورة", download: "تنزيل {name}",
      fileTooBig: "الحد الأقصى لحجم الملف 10 MB.", fileType: "أرسل صورة أو ملف PDF أو مستندًا (TXT, CSV, DOCX, XLSX).",
      kb: "{n} KB", mb: "{n} MB",
    },
    tr: {
      open: "Sohbeti aç", chat: "Sohbet", chatWith: "{name} ile sohbet et", minimize: "Sohbeti küçült",
      ask: "Bir soru sorun", message: "Mesaj", send: "Mesajı gönder",
      person: "Bir kişiyle görüş", wantPerson: "Bir kişiyle görüşmek istiyorum.", newChat: "Yeni sohbet başlat",
      powered: "Replybek ile çalışır",
      note: "Yanıtlar, bu işletmenin bilgilerine dayanarak yapay zekâ tarafından yazılır. İhtiyaç duyarsanız bir kişi yardımcı olabilir.",
      sources: { one: "{count} kaynak kullanıldı", other: "{count} kaynak kullanıldı" },
      signInTo: "Giriş yapın: {name}", signInNote: "Girişi işletmenin sayfasında yapacaksınız. Şifreniz bu sohbetle paylaşılmaz.", signIn: "Giriş yap",
      pleaseConfirm: "Lütfen onaylayın", confirm: "Onayla", cancel: "İptal",
      confirmed: "Onaylandı", cancelled: "İptal edildi", failed: "Gerçekleştirilemedi",
      team: "{name} ekibi", typing: "Yapay zekâ ajanı yazıyor", teamTyping: "{name} yazıyor",
      steps: { search: "Yardım belgelerimize bakılıyor…", tool: "Sistemimizde kontrol ediliyor…", confirm: "Onaylamanız için değişiklik hazırlanıyor…", writing: "Yanıt yazılıyor…" },
      handoff: "Bir ekip arkadaşımızdan sohbete katılması istendi. Yanıtı buraya gelecek. Bu sayfayı açık tutabilir veya daha sonra geri dönebilirsiniz.",
      replying: "Bir ekip üyesi yanıtlıyor", waiting: "Ekip bekleniyor", agent: "{name} · yapay zekâ ajanı",
      errSend: "Mesajınız gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.",
      errExpired: "Bu sohbetin süresi doldu. Lütfen mesajınızı tekrar gönderin.",
      wrong: "Bir sorun oluştu.",
      attach: "Dosya ekle", removeFile: "Dosyayı kaldır", photo: "Fotoğraf", openPhoto: "Fotoğrafı aç", download: "İndir: {name}",
      fileTooBig: "Dosyalar en fazla 10 MB olabilir.", fileType: "Fotoğraf, PDF veya belge (TXT, CSV, DOCX, XLSX) gönderin.",
      kb: "{n} KB", mb: "{n} MB",
    },
    hi: {
      open: "चैट खोलें", chat: "चैट", chatWith: "{name} से चैट करें", minimize: "चैट छोटा करें",
      ask: "अपना सवाल पूछें", message: "संदेश", send: "संदेश भेजें",
      person: "किसी व्यक्ति से बात करें", wantPerson: "मुझे किसी व्यक्ति से बात करनी है।", newChat: "नई चैट शुरू करें",
      powered: "Replybek द्वारा संचालित",
      note: "जवाब इस व्यवसाय की जानकारी के आधार पर AI लिखता है। ज़रूरत हो तो कोई व्यक्ति आपकी मदद कर सकता है।",
      sources: { one: "{count} स्रोत इस्तेमाल हुआ", other: "{count} स्रोत इस्तेमाल हुए" },
      signInTo: "{name} में साइन इन करें", signInNote: "साइन इन व्यवसाय के पेज पर होगा। आपका पासवर्ड इस चैट के साथ साझा नहीं किया जाता।", signIn: "साइन इन करें",
      pleaseConfirm: "कृपया पुष्टि करें", confirm: "पुष्टि करें", cancel: "रद्द करें",
      confirmed: "पुष्टि हो गई", cancelled: "रद्द किया गया", failed: "पूरा नहीं हो सका",
      team: "{name} टीम", typing: "AI एजेंट लिख रहा है", teamTyping: "{name} लिख रहे हैं",
      steps: { search: "हमारे सहायता दस्तावेज़ देखे जा रहे हैं…", tool: "हमारे सिस्टम में जाँच की जा रही है…", confirm: "आपकी पुष्टि के लिए बदलाव तैयार किया जा रहा है…", writing: "जवाब लिखा जा रहा है…" },
      handoff: "टीम के एक सदस्य को जुड़ने के लिए कहा गया है। जवाब यहीं आएगा। आप यह पेज खुला रख सकते हैं या बाद में लौट सकते हैं।",
      replying: "टीम का एक सदस्य जवाब दे रहा है", waiting: "टीम का इंतज़ार है", agent: "{name} · AI एजेंट",
      errSend: "आपका संदेश नहीं भेजा जा सका। अपना कनेक्शन जाँचें और फिर से कोशिश करें।",
      errExpired: "यह चैट समाप्त हो गई है। कृपया अपना संदेश फिर से भेजें।",
      wrong: "कुछ गड़बड़ हो गई।",
      attach: "फ़ाइल अटैच करें", removeFile: "फ़ाइल हटाएँ", photo: "फ़ोटो", openPhoto: "फ़ोटो खोलें", download: "{name} डाउनलोड करें",
      fileTooBig: "फ़ाइलें अधिकतम 10 MB तक की हो सकती हैं।", fileType: "फ़ोटो, PDF या दस्तावेज़ (TXT, CSV, DOCX, XLSX) भेजें।",
      kb: "{n} KB", mb: "{n} MB",
    },
    id: {
      open: "Buka chat", chat: "Chat", chatWith: "Chat dengan {name}", minimize: "Perkecil chat",
      ask: "Ajukan pertanyaan", message: "Pesan", send: "Kirim pesan",
      person: "Bicara dengan petugas", wantPerson: "Saya ingin bicara dengan petugas.", newChat: "Mulai chat baru",
      powered: "Didukung oleh Replybek",
      note: "Jawaban ditulis oleh AI berdasarkan informasi bisnis ini. Petugas dapat membantu jika Anda membutuhkannya.",
      sources: { other: "{count} sumber digunakan" },
      signInTo: "Masuk ke {name}", signInNote: "Anda akan masuk di halaman bisnis tersebut. Kata sandi Anda tidak dibagikan ke chat ini.", signIn: "Masuk",
      pleaseConfirm: "Mohon konfirmasi", confirm: "Konfirmasi", cancel: "Batal",
      confirmed: "Dikonfirmasi", cancelled: "Dibatalkan", failed: "Tidak berhasil",
      team: "Tim {name}", typing: "Agen AI sedang mengetik", teamTyping: "{name} sedang mengetik",
      steps: { search: "Mencari di dokumen bantuan kami…", tool: "Mengecek di sistem kami…", confirm: "Menyiapkan perubahan untuk Anda konfirmasi…", writing: "Menulis jawaban…" },
      handoff: "Seorang anggota tim sudah diminta bergabung. Mereka akan membalas di sini. Anda dapat membiarkan halaman ini terbuka atau kembali nanti.",
      replying: "Anggota tim sedang membalas", waiting: "Menunggu tim", agent: "{name} · agen AI",
      errSend: "Pesan Anda tidak terkirim. Periksa koneksi Anda, lalu coba lagi.",
      errExpired: "Chat ini sudah kedaluwarsa. Silakan kirim pesan Anda lagi.",
      wrong: "Terjadi kesalahan.",
      attach: "Lampirkan file", removeFile: "Hapus file", photo: "Foto", openPhoto: "Buka foto", download: "Unduh {name}",
      fileTooBig: "Ukuran file maksimal 10 MB.", fileType: "Kirim foto, PDF, atau dokumen (TXT, CSV, DOCX, XLSX).",
      kb: "{n} KB", mb: "{n} MB",
    },
    pl: {
      open: "Otwórz czat", chat: "Czat", chatWith: "Czat z firmą {name}", minimize: "Zminimalizuj czat",
      ask: "Wpisz pytanie", message: "Wiadomość", send: "Wyślij wiadomość",
      person: "Porozmawiaj z konsultantem", wantPerson: "Proszę o rozmowę z konsultantem.", newChat: "Rozpocznij nowy czat",
      powered: "Obsługiwane przez Replybek",
      note: "Odpowiedzi pisze AI na podstawie informacji tej firmy. W razie potrzeby pomoże konsultant.",
      sources: { one: "Wykorzystano {count} źródło", few: "Wykorzystano {count} źródła", many: "Wykorzystano {count} źródeł", other: "Wykorzystano {count} źródła" },
      signInTo: "Zaloguj się w serwisie {name}", signInNote: "Logowanie odbywa się na stronie firmy. Hasło nie jest udostępniane temu czatowi.", signIn: "Zaloguj się",
      pleaseConfirm: "Prosimy o potwierdzenie", confirm: "Potwierdź", cancel: "Anuluj",
      confirmed: "Potwierdzono", cancelled: "Anulowano", failed: "Nie udało się",
      team: "Zespół {name}", typing: "Agent AI pisze", teamTyping: "{name} pisze",
      steps: { search: "Przeszukiwanie dokumentacji pomocy…", tool: "Sprawdzanie w naszym systemie…", confirm: "Przygotowywanie zmiany do potwierdzenia…", writing: "Pisanie odpowiedzi…" },
      handoff: "Poprosiliśmy członka zespołu o dołączenie. Odpowiedź pojawi się tutaj. Można zostawić tę stronę otwartą lub wrócić później.",
      replying: "Członek zespołu odpisuje", waiting: "Oczekiwanie na zespół", agent: "{name} · agent AI",
      errSend: "Nie udało się wysłać wiadomości. Sprawdź połączenie i spróbuj ponownie.",
      errExpired: "Ten czat wygasł. Wyślij wiadomość ponownie.",
      wrong: "Coś poszło nie tak.",
      attach: "Załącz plik", removeFile: "Usuń plik", photo: "Zdjęcie", openPhoto: "Otwórz zdjęcie", download: "Pobierz {name}",
      fileTooBig: "Pliki mogą mieć maksymalnie 10 MB.", fileType: "Wyślij zdjęcie, plik PDF lub dokument (TXT, CSV, DOCX, XLSX).",
      kb: "{n} KB", mb: "{n} MB",
    },
  };
  // Any language with built-in texts below; others fall back to English (the greeting and questions
  // still come in the page's language when the server has them).
  const LANG = Object.hasOwn(STRINGS, LANGUAGE) ? LANGUAGE : "en";
  // Right-to-left languages (Arabic) mirror the chat. Browsers without Intl text info know the common ones.
  const DIR = (() => {
    try {
      const locale = new Intl.Locale(LANG);
      const info = typeof locale.getTextInfo === "function" ? locale.getTextInfo() : locale.textInfo;
      if (info && info.direction) return info.direction;
    } catch {
      // fall through
    }
    return ["ar", "he", "fa", "ur"].includes(LANG) ? "rtl" : "ltr";
  })();
  const plural = new Intl.PluralRules(LANG);
  function t(key, params = {}) {
    let s = STRINGS[LANG][key] ?? STRINGS.en[key];
    if (s && typeof s === "object") s = s[plural.select(params.count ?? 0)] ?? s.other;
    return String(s).replace(/\{(\w+)\}/g, (m, k) => (params[k] == null ? m : String(params[k])));
  }
  // Times and sizes in the widget's language (the region is a guess only where it matters for en/uz/ru).
  const LOCALE = { en: "en-US", uz: "uz-UZ", ru: "ru-RU" }[LANG] || LANG;

  const STORE = `replybek:${KEY}`;
  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(STORE)) || {};
    } catch {
      return {};
    }
  };
  const save = (v) => {
    try {
      localStorage.setItem(STORE, JSON.stringify(v));
    } catch {
      // Private browsing: the chat still works, it just won't survive a reload.
    }
  };

  // ───── Tiny DOM helper ─────
  function h(tag, props = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  }
  const ICON = {
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    person: '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>',
    chev: '<path d="m9 18 6-6-6-6"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    restart: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  };
  const icon = (name, size = 18) => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("width", size);
    s.setAttribute("height", size);
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "2");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = ICON[name]; // static markup from this file only
    return s;
  };
  const initials = (s) => s.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const time = (at) => new Date(at).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });

  const headers = (token, json) => ({ "Accept-Language": LANG, ...(json ? { "Content-Type": "application/json" } : {}), ...(token ? { "X-Visitor-Token": token } : {}), ...(INPAGE ? { "X-Replybek-Inpage": INPAGE } : {}) });
  async function call(method, path, body, token) {
    const form = body instanceof FormData;
    const res = await fetch(`${API}/widget/${KEY}${path}`, {
      method,
      headers: headers(token, Boolean(body) && !form),
      body: form ? body : body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.message || t("wrong")), { status: res.status });
    return data;
  }

  // ───── State ─────
  let config;
  let session = load(); // { conversation_id, visitor_token }
  let messages = []; // from the server
  let status = "ai";
  let open = false;
  let sending = false;
  let unseen = 0;
  let teamTyping = null;     // { name, until }: a teammate is writing a reply
  let who = null;            // { name, email } from window.Replybek.identify() on a signed-in page
  let typedAt = 0;           // when we last told the team the visitor is typing
  let pollTimer = null;
  let thinking = false;      // the AI is working (answering with tools, or finishing a confirmed change)
  let progress = null;       // what it's doing right now ("Checking our system…"), from the live stream
  let progressAt = 0;        // when that step appeared: each stays at least STEP_MS, so quick ones can be read
  let progressNext = null;
  let progressTimer = null;
  const STEP_MS = 800;
  let activeTimer = null;    // the fast poll that runs while thinking
  let live = null;           // the open live-updates request (an AbortController)
  let liveUp = false;        // events are flowing, so polling only backs them up
  const running = new Set(); // in-page tool calls being executed right now

  // ───── Shell ─────
  const host = h("div", { id: "replybek-widget" });
  const root = host.attachShadow({ mode: "open" });
  root.append(h("style", { text: css }));
  const launcher = h("button", { class: "launcher", type: "button", "aria-expanded": "false", "aria-label": t("open"), onClick: () => toggle() }, icon("chat", 24));
  // ───── Files ─────
  // Photos and documents, up to 10 MB. The server checks the bytes again; this only spares a
  // useless upload. Files are fetched with the visitor token and shown from blob URLs.
  const MAX_FILE = 10 * 1024 * 1024;
  const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.txt,.csv,.docx,.xlsx";
  const okFile = (f) => /^image\/(jpeg|png|webp|gif)$/.test(f.type) || /\.(jpe?g|png|webp|gif|pdf|txt|csv|docx|xlsx)$/i.test(f.name);
  const isImage = (a) => /^image\//.test(a.type);
  const sizeText = (n) => (n < 1024 * 1024 ? t("kb", { n: Math.max(1, Math.round(n / 1024)) }) : t("mb", { n: (n / 1048576).toFixed(1) }));
  const blobs = new Map(); // attachment id → blob URL
  function fileUrl(a) {
    if (a.local) return Promise.resolve(a.local);
    if (!blobs.has(a.id)) {
      const p = fetch(`${API}/widget/${KEY}/conversations/${session.conversation_id}/files/${a.id}`, { headers: headers(session.visitor_token), credentials: "omit" })
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then((b) => URL.createObjectURL(b));
      p.catch(() => blobs.delete(a.id));
      blobs.set(a.id, p);
    }
    return blobs.get(a.id);
  }
  let pending = null; // { file, url } chosen and not yet sent

  const badge = h("span", { class: "badge", hidden: true });
  launcher.append(badge);
  const panel = h("section", { class: "panel", role: "dialog", "aria-label": t("chat"), dir: DIR, lang: LANG, hidden: true });
  const list = h("div", { class: "body", "aria-live": "polite" });
  const input = h("input", { type: "text", placeholder: t("ask"), maxlength: "2000", "aria-label": t("message"), autocomplete: "off" });
  const sendBtn = h("button", { class: "send", type: "submit", "aria-label": t("send"), disabled: true }, icon("send", 16));
  const fileInput = h("input", { type: "file", accept: ACCEPT, hidden: true, tabindex: "-1" });
  const attachBtn = h("button", { class: "attach", type: "button", "aria-label": t("attach"), title: t("attach"), onClick: () => fileInput.click() }, icon("clip", 18));
  const tray = h("div", { class: "tray", hidden: true });
  const humanBtn = h("button", { class: "human", type: "button", onClick: () => askHuman() }, icon("person", 13), t("person"));
  // An icon, so the footer stays one row in every language; its name shows on hover and to screen readers.
  const newChat = h("button", { class: "linkish new-chat", type: "button", hidden: true, title: t("newChat"), "aria-label": t("newChat"), onClick: () => restart() }, icon("restart", 15));
  const status1 = h("span", { class: "sub-text" });
  const title = h("div", { class: "title" });
  const avatar = h("span", { class: "av", "aria-hidden": "true" });
  // "Powered by Replybek" in the widget's language. Where the row is too narrow for it, only the
  // name stays ("Replybek"), so the footer keeps one row and the name is never cut off.
  const [poweredBefore, ...poweredAfter] = t("powered").split("Replybek");
  const brand = h("span", { class: "brand", title: t("powered") }, h("span", { class: "brand-words", text: poweredBefore }), "Replybek", h("span", { class: "brand-words", text: poweredAfter.join("Replybek") }));
  function fitBrand() {
    brand.classList.remove("short");
    if (!brand.hidden && brand.scrollWidth > brand.clientWidth + 1) brand.classList.add("short");
  }

  panel.append(
    h(
      "header",
      { class: "head" },
      avatar,
      h("div", { class: "head-text" }, title, h("div", { class: "sub" }, h("span", { class: "dot", "aria-hidden": "true" }), status1)),
      h("button", { class: "icon", type: "button", "aria-label": t("minimize"), onClick: () => toggle(false) }, icon("minus"))
    ),
    list,
    h(
      "div",
      { class: "foot" },
      tray,
      h(
        "form",
        {
          class: "input",
          onSubmit: (e) => {
            e.preventDefault();
            send(input.value);
          },
        },
        attachBtn,
        input,
        sendBtn,
        fileInput
      ),
      h("div", { class: "links" }, h("span", { class: "left" }, humanBtn, newChat), brand)
    )
  );
  const canSend = () => (input.value.trim() || pending) && !sending;
  input.addEventListener("input", () => {
    sendBtn.disabled = !canSend();
    // Tell the team the visitor is typing: at most every 3 s, only in a chat that exists.
    if (session.conversation_id && input.value.trim() && Date.now() - typedAt > 3000) {
      typedAt = Date.now();
      call("POST", `/conversations/${session.conversation_id}/typing`, {}, session.visitor_token).catch(() => {});
    }
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) choose(fileInput.files[0]);
    fileInput.value = "";
  });
  // A pasted screenshot or a file dropped on the chat is attached the same way.
  input.addEventListener("paste", (e) => {
    const f = e.clipboardData && e.clipboardData.files[0];
    if (f) {
      e.preventDefault();
      choose(f);
    }
  });
  panel.addEventListener("dragover", (e) => {
    if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault();
  });
  panel.addEventListener("drop", (e) => {
    const f = e.dataTransfer && e.dataTransfer.files[0];
    if (f) {
      e.preventDefault();
      choose(f);
    }
  });
  function choose(f) {
    if (!okFile(f)) return showError(t("fileType"));
    if (f.size > MAX_FILE) return showError(t("fileTooBig"));
    clearPending();
    pending = { file: f, url: /^image\/(jpeg|png|webp|gif)$/.test(f.type) ? URL.createObjectURL(f) : null };
    const thumb = pending.url ? h("img", { class: "tray-img", src: pending.url, alt: "" }) : h("span", { class: "tray-ic" }, icon("file", 16));
    tray.replaceChildren(
      h("div", { class: "tray-file" }, thumb, h("span", { class: "tray-name" }, h("b", { text: f.name }), h("small", { text: sizeText(f.size) })),
        h("button", { class: "tray-x", type: "button", "aria-label": t("removeFile"), onClick: () => { clearPending(); input.focus(); } }, icon("x", 14)))
    );
    tray.hidden = false;
    sendBtn.disabled = !canSend();
    input.focus();
  }
  function clearPending(keepUrl) {
    if (pending && pending.url && !keepUrl) URL.revokeObjectURL(pending.url);
    pending = null;
    tray.hidden = true;
    tray.replaceChildren();
    sendBtn.disabled = !canSend();
  }
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggle(false);
  });

  // ───── Rendering ─────
  function sourcesEl(sources) {
    if (!sources || !sources.length) return null;
    const box = h("div", { class: "sources", hidden: true });
    for (const s of sources) {
      // Only http(s) links from our own API are rendered as links.
      const link = s.url && /^https?:\/\//i.test(s.url) ? h("a", { class: "src-name", href: s.url, target: "_blank", rel: "noopener noreferrer", text: s.name }) : h("div", { class: "src-name", text: s.name });
      box.append(h("div", { class: "src" }, link, s.heading ? h("div", { class: "src-head", text: s.heading }) : null, h("div", { class: "src-text", text: s.text })));
    }
    const btn = h("button", { class: "src-toggle", type: "button", "aria-expanded": "false" }, icon("chev", 12), t("sources", { count: sources.length }));
    btn.addEventListener("click", () => {
      const showing = box.hidden;
      box.hidden = !showing;
      btn.setAttribute("aria-expanded", String(showing));
      btn.classList.toggle("open", showing);
    });
    return h("div", { class: "src-wrap" }, btn, box);
  }

  function filesEl(files) {
    if (!files || !files.length) return null;
    return h("div", { class: "files" }, files.map((a) => {
      if (isImage(a)) {
        const img = h("img", { alt: a.name });
        fileUrl(a).then((u) => {
          const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
          img.src = u;
          img.addEventListener("load", () => atBottom && (list.scrollTop = list.scrollHeight), { once: true });
        }, () => img.replaceWith(h("span", { class: "file-broken", text: a.name })));
        return h("button", { class: "file-img", type: "button", "aria-label": t("openPhoto"), onClick: () => fileUrl(a).then((u) => window.open(u, "_blank", "noopener")) }, img);
      }
      return h("button", { class: "file-doc", type: "button", "aria-label": t("download", { name: a.name }), onClick: () => fileUrl(a).then((u) => {
        const link = h("a", { href: u, download: a.name });
        root.append(link);
        link.click();
        link.remove();
      }) }, h("span", { class: "file-ic" }, icon("file", 16)), h("span", { class: "file-name" }, h("b", { text: a.name }), h("small", { text: sizeText(a.size) })));
    }));
  }

  // An AI message can carry a card: sign in to the business's system, or confirm a change.
  function cardEl(m) {
    const c = m.card;
    if (!c) return null;
    if (c.type === "connect") {
      // Only on the latest answer: once the customer signs in, a new answer follows.
      if (messages.filter((x) => x.role === "ai").pop() !== m) return null;
      return h(
        "div",
        { class: "card" },
        h("div", { class: "card-title", text: t("signInTo", { name: c.name }) }),
        h("div", { class: "card-state", text: t("signInNote") }),
        h("div", { class: "card-actions" }, h("button", { class: "card-btn", type: "button", onClick: () => connect(c) }, icon("lock", 13), " " + t("signIn")))
      );
    }
    if (c.type === "confirm") {
      const lines = h("div", { class: "card-lines" });
      for (const [a, b] of c.lines || []) lines.append(h("span", { text: String(a) }), h("span", { text: b == null ? "" : String(b) }));
      const pending = c.status === "pending";
      const state = { done: t("confirmed"), cancelled: t("cancelled"), failed: t("failed") }[c.status];
      return h(
        "div",
        { class: "card" },
        h("div", { class: "card-title", text: c.title || t("pleaseConfirm") }),
        (c.lines || []).length ? lines : null,
        c.total ? h("div", { class: "card-total", text: String(c.total) }) : null,
        pending
          ? h(
              "div",
              { class: "card-actions" },
              h("button", { class: "card-btn", type: "button", onClick: (e) => decide(c, true, e.currentTarget) }, t("confirm")),
              h("button", { class: "card-btn ghost", type: "button", onClick: (e) => decide(c, false, e.currentTarget) }, t("cancel"))
            )
          : h("div", { class: `card-state ${c.status === "done" ? "done" : ""}`, text: state || "" })
      );
    }
    if (c.type === "products") {
      // Things to look at (bouquets, products): a row of cards, each a link to its page. A page
      // on this same site opens in place, so the chat follows the customer there.
      const here = (u) => {
        try {
          return new URL(u).origin === location.origin;
        } catch (e) {
          return false;
        }
      };
      const price = (i) => (i.price == null ? "" : typeof i.price === "number" ? i.price.toLocaleString("ru-RU").replace(/\u00a0/g, " ") + (i.currency ? " " + i.currency : "") : String(i.price));
      return h(
        "div",
        { class: "pcards" + ((c.items || []).length === 1 ? " one" : "") },
        (c.items || []).map((i) =>
          h(
            i.url ? "a" : "div",
            { class: "pcard", href: i.url || null, target: i.url && !here(i.url) ? "_blank" : null, rel: i.url ? "noopener" : null },
            h("span", { class: "pcard-photo" }, i.image ? h("img", { src: i.image, alt: "", loading: "lazy", decoding: "async" }) : null),
            h("span", { class: "pcard-body" }, h("span", { class: "pcard-title", text: i.title }), i.subtitle ? h("span", { class: "pcard-sub", text: i.subtitle }) : null, price(i) ? h("span", { class: "pcard-price", text: price(i) }) : null)
          )
        )
      );
    }
    return null;
  }

  function render() {
    list.replaceChildren();
    list.append(h("div", { class: "note", text: t("note") }));
    list.append(h("div", { class: "msg bot" }, h("div", { class: "bubble", text: config.welcome })));
    if (!messages.length && config.suggestions?.length) {
      const chips = h("div", { class: "chips" });
      for (const q of config.suggestions) chips.append(h("button", { class: "chip", type: "button", text: q, onClick: () => send(q) }));
      list.append(chips);
    }
    for (const m of messages) {
      const mine = m.role === "visitor";
      const who = m.role === "human";
      list.append(
        h(
          "div",
          { class: `msg ${mine ? "me" : m.role === "human" ? "bot team" : "bot"}` },
          who ? h("div", { class: "who", text: t("team", { name: config.display_name }) }) : null,
          m.body ? h("div", { class: "bubble", text: m.body }) : null,
          filesEl(m.attachments),
          m.role === "ai" ? sourcesEl(m.sources) : null,
          m.role === "ai" ? cardEl(m) : null,
          h("span", { class: "time", text: time(m.created_at) })
        )
      );
    }
    const waiting = status === "needs_human" || status === "human";
    // The AI's dots only while the AI is answering; a teammate's own, with their name.
    if (!thinking && !sending) {
      progress = progressNext = null;
      clearTimeout(progressTimer);
    }
    if (thinking || (sending && !waiting)) {
      const dots = h("div", { class: "typing", "aria-hidden": "true" }, h("span"), h("span"), h("span"));
      list.append(h("div", { class: "working", role: "status", "aria-label": progress || t("typing") }, dots, progress ? h("span", { class: "step", text: progress }) : null));
    }
    else if (teamTyping && teamTyping.until > Date.now()) {
      const label = t("teamTyping", { name: teamTyping.name || t("team", { name: config.display_name }) });
      list.append(h("div", { class: "msg bot team" }, h("div", { class: "who", text: label }), h("div", { class: "typing", role: "status", "aria-label": label }, h("span"), h("span"), h("span"))));
    }
    const last = messages.filter((m) => m.role === "ai").pop();
    if (!waiting && !sending && last && last.kind === "fallback" && config.handoff) {
      list.append(h("div", { class: "chips" }, h("button", { class: "chip", type: "button", onClick: () => askHuman() }, t("person"))));
    }
    if (status === "needs_human") list.append(h("div", { class: "handoff", role: "status", text: t("handoff") }));
    status1.textContent = waiting ? (status === "human" ? t("replying") : t("waiting")) : t("agent", { name: config.name });
    humanBtn.hidden = !config.handoff || waiting;
    newChat.hidden = !session.conversation_id || !messages.length;
    fitBrand();
    sendBtn.disabled = !canSend();
    list.scrollTop = list.scrollHeight;
    if (open) markSeen();
  }

  // ───── Who the visitor is ─────
  // What identify() accepts, trimmed to what the API takes; anything invalid is left out, so a
  // page's mistake never stops the chat from starting.
  const str = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
  const PHOTO = /^(https:\/\/[^\s"'<>]{1,2000}|data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+)$/;
  function visitorInfo(info) {
    const email = str(info.email, 200);
    const avatar = typeof info.avatar === "string" && info.avatar.length <= 300000 && PHOTO.test(info.avatar) ? info.avatar : undefined;
    const c = info.company && typeof info.company === "object" ? info.company : null;
    const company = c ? clean({ id: str(c.id == null ? undefined : String(c.id), 100), name: str(c.name, 120), plan: str(c.plan, 60), website: str(c.website, 200) }) : undefined;
    let attributes;
    if (info.attributes && typeof info.attributes === "object") {
      const kept = Object.entries(info.attributes)
        .filter(([k, v]) => k.trim() && k.length <= 60 && (v === null || typeof v === "number" || typeof v === "boolean" || typeof v === "string"))
        .slice(0, 30)
        .map(([k, v]) => [k.trim(), typeof v === "string" ? v.slice(0, 500) : v]);
      if (kept.length) attributes = Object.fromEntries(kept);
    }
    return clean({
      user_id: str(info.user_id == null ? undefined : String(info.user_id), 100),
      name: str(info.name, 80),
      email: email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : undefined,
      phone: str(info.phone, 40),
      avatar,
      company: company && Object.keys(company).length ? company : undefined,
      attributes,
    });
  }
  function clean(o) {
    return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  }

  // ───── Read and unread ─────
  // The page hears the unread count (for its own chat button, with data-launcher="none").
  const announceUnread = () => window.dispatchEvent(new CustomEvent("replybek:unread", { detail: { count: unseen } }));
  // The newest reply the visitor has seen, kept with the conversation in this browser, so a reload
  // doesn't count replies they already read.
  const replies = () => messages.filter((m) => m.role !== "visitor" && !String(m.id).startsWith("tmp-"));
  function markSeen() {
    const last = replies().pop();
    if (!last || (session.seen && session.seen >= last.created_at)) return;
    session.seen = last.created_at;
    save(session);
  }

  function showError(text) {
    list.append(h("div", { class: "error", role: "alert", text }));
    list.scrollTop = list.scrollHeight;
  }

  // ───── Behaviour ─────
  let opener = null; // what had focus before the page opened the chat, to return to
  function toggle(force) {
    const was = open;
    open = force === undefined ? !open : force;
    if (open && !was) opener = document.activeElement;
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? t("minimize") : t("chatWith", { name: config.display_name }));
    launcher.firstChild.replaceWith(icon(open ? "minus" : "chat", 24));
    host.classList.toggle("is-open", open);
    if (open) {
      unseen = 0;
      badge.hidden = true;
      announceUnread();
      render();
      setTimeout(() => input.focus(), 30);
    } else if (!NO_LAUNCHER) launcher.focus();
    else if (was && opener && opener.focus) opener.focus();
    schedulePoll();
  }

  // The visitor's time zone ("Asia/Tashkent"), so the AI agent knows their "today" and "tomorrow".
  function timeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      return "";
    }
  }

  async function ensureConversation() {
    if (session.conversation_id) return;
    // After "Start a new chat", the new conversation is linked to the one left behind.
    const base = { page: location.pathname.slice(0, 400), language: LANGUAGE, ...(timeZone() ? { timezone: timeZone() } : {}), ...(session.previous ? { previous: session.previous } : {}) };
    // If the API refuses what the page said about the visitor, the chat still starts without it.
    const r = await call("POST", "/conversations", { ...base, ...(who || {}) }).catch((e) => (e.status === 400 && who ? call("POST", "/conversations", base) : Promise.reject(e)));
    session = { conversation_id: r.conversation_id, visitor_token: r.visitor_token };
    save(session);
  }

  function absorb(r) {
    const known = new Set(messages.map((m) => m.id));
    const fresh = r.messages.filter((m) => !known.has(m.id));
    // A live update can bring the server's copy of a message while it's still being sent: that copy
    // replaces the one shown meanwhile, so the message never appears twice.
    for (const m of fresh) {
      if (m.role !== "visitor") continue;
      const i = messages.findIndex((x) => String(x.id).startsWith("tmp-") && x.body === (m.body || "") && (x.attachments || []).length === (m.attachments || []).length);
      if (i >= 0) messages.splice(i, 1);
    }
    messages = messages.concat(fresh);
    status = r.status;
    if (fresh.some((m) => m.role === "human")) teamTyping = null;
    const unread = fresh.filter((m) => m.role !== "visitor" && !(session.seen && m.created_at <= session.seen));
    if (!open && unread.length) {
      unseen += unread.length;
      badge.textContent = String(unseen);
      badge.hidden = false;
      announceUnread();
    }
  }

  async function send(text) {
    const q = text.trim();
    const file = pending;
    if ((!q && !file) || sending) return;
    sending = true;
    progress = null;
    input.value = "";
    if (file) clearPending(true);
    // Show the visitor's message right away; the server's copy replaces it.
    const local = file ? [{ id: "local", local: file.url, name: file.file.name, type: file.file.type, size: file.file.size }] : [];
    const temp = { id: `tmp-${Date.now()}`, role: "visitor", body: q, attachments: local, created_at: new Date().toISOString() };
    messages.push(temp);
    render();
    try {
      await ensureConversation();
      // A new chat's live stream is still connecting: give it a moment, so this answer's progress shows.
      syncLive();
      await liveReady(800);
      // The page's language: replies to a message with no clear language of its own (an emoji, a number) use it.
      let body = { text: q, language: LANGUAGE };
      if (file) {
        body = new FormData();
        body.append("text", q);
        body.append("language", LANGUAGE);
        body.append("file", file.file, file.file.name);
      }
      const r = await call("POST", `/conversations/${session.conversation_id}/messages`, body, session.visitor_token);
      messages = messages.filter((m) => m !== temp);
      absorb(r);
      if (r.thinking) startActive();
    } catch (e) {
      messages = messages.filter((m) => m !== temp);
      input.value = q;
      if (file) choose(file.file);
      if (e.status === 404) restartSilently();
      showError(e.status === 429 ? e.message : e.status === 404 ? t("errExpired") : e.status === 413 ? t("fileTooBig") : e.status === 415 ? t("fileType") : t("errSend"));
      sending = false;
      sendBtn.disabled = !canSend();
      if (file && file.url) URL.revokeObjectURL(file.url);
      return;
    }
    sending = false;
    render();
    if (file && file.url) URL.revokeObjectURL(file.url);
    schedulePoll();
  }


  // Sign in on the business's own page in a popup. The popup must open during the click, so it
  // starts blank and gets its address once we have it.
  async function connect(c) {
    const popup = window.open("", "replybek-signin", "width=480,height=640");
    try {
      const r = await call("POST", `/conversations/${session.conversation_id}/integrations/${c.integration_id}/connect`, {}, session.visitor_token);
      if (popup) popup.location.href = r.url;
      else location.href = r.url;
    } catch (e) {
      if (popup) popup.close();
      showError(e.message);
    }
  }
  // The sign-in page tells us when it's done; the answer to the waiting question follows.
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "replybek:connected" && e.data.ok) followUp();
  });
  function followUp() {
    const startCount = messages.filter((m) => m.role === "ai").length;
    let tries = 0;
    sending = true;
    render();
    const tick = async () => {
      await poll();
      tries += 1;
      if (messages.filter((m) => m.role === "ai").length > startCount || tries > 30) {
        sending = false;
        render();
      } else setTimeout(tick, 2000);
    };
    setTimeout(tick, 1000);
  }

  async function decide(c, confirm, btn) {
    btn.disabled = true;
    try {
      const r = await call("POST", `/conversations/${session.conversation_id}/actions/${c.action_id}/${confirm ? "confirm" : "cancel"}`, {}, session.visitor_token);
      c.status = confirm ? "done" : "cancelled";
      absorb(r);
      if (r.thinking) startActive();
      else await poll();
      render();
    } catch (e) {
      btn.disabled = false;
      showError(e.message);
    }
  }

  async function askHuman() {
    try {
      await ensureConversation();
      if (!messages.length) {
        // Leave a visible request in the transcript so the team sees what started it.
        await send(t("wantPerson"));
      }
      const r = await call("POST", `/conversations/${session.conversation_id}/handoff`, null, session.visitor_token);
      status = r.status;
      render();
      schedulePoll();
    } catch (e) {
      showError(e.message);
    }
  }

  // Runs one request the AI asked for, in this page, with the user's own session, then reports back.
  async function runToolCall(tc) {
    if (running.has(tc.id)) return;
    running.add(tc.id);
    let result = { status: 0, body: null };
    try {
      const req = tc.request || {};
      const path = String(req.path || "");
      const method = (req.method || "POST").toUpperCase();
      if (INPAGE && path.startsWith("/") && !path.startsWith("//")) {
        const target = new URL(path, location.origin);
        if (target.origin !== location.origin || target.username || target.password) throw new Error("Invalid request origin");
        const authHeaders = {};
        let credential = "", authValue = "";
        if (req.browser_auth?.provider === "host_token") {
          const provider = window.ReplybekAuth?.getToken;
          if (typeof provider !== "function") throw new Error("Host token provider is not configured");
          const header = req.browser_auth.header || "Authorization";
          if (!/^[a-zA-Z0-9-]{1,80}$/.test(header) || /^(?:cookie|host|origin|referer|content-length|connection|proxy-.*|sec-.*)$/i.test(header)) throw new Error("Invalid authentication header");
          let providerTimer;
          try {
            credential = await Promise.race([
              Promise.resolve().then(() => provider({ integrationId: tc.integration_id, method, path })),
              new Promise((_, reject) => { providerTimer = setTimeout(() => reject(new Error("Host token provider timed out")), 10000); }),
            ]);
          } finally { clearTimeout(providerTimer); }
          if (typeof credential !== "string" || !credential || credential.length > 8192 || /[\r\n]/.test(credential)) throw new Error("Host token provider returned an invalid credential");
          authValue = (req.browser_auth.prefix ?? "Bearer ") + credential;
          authHeaders[header] = authValue;
        }
        const res = await fetch(target.href, {
          method,
          headers: { "X-Requested-With": "XMLHttpRequest", ...(req.body != null && method !== "GET" ? { "Content-Type": "application/json" } : {}), ...(req.headers || {}), ...authHeaders },
          body: req.body != null && method !== "GET" ? JSON.stringify(req.body) : undefined,
          credentials: "include",
          redirect: "error",
          signal: AbortSignal.timeout(30000),
        });
        let text = await res.text();
        // Do not return an API's verbatim echo of the runtime credential to Replybek.
        if (credential) for (const value of [authValue, credential, JSON.stringify(credential).slice(1,-1), encodeURIComponent(credential)]) if (value) text = text.split(value).join("[REDACTED]");
        if (text.length > 600000) {
          // Too big to send back; the server will tell the AI to narrow the request.
          result = { status: res.status, body: { error: "response_too_large" } };
        } else {
          let body = text;
          try {
            body = text ? JSON.parse(text) : null;
          } catch {
            // Some endpoints answer with plain text or HTML.
          }
          result = { status: res.status, body };
        }
      }
    } catch {
      result = { status: 0, body: null };
    }
    try {
      await call("POST", `/conversations/${session.conversation_id}/tool-calls/${tc.id}`, result, session.visitor_token);
    } catch {
      // The result will be retried on the next poll if it's still pending.
    }
    running.delete(tc.id);
  }

  // While the AI is working, poll quickly and execute any requests it hands us, until it replies.
  function startActive() {
    thinking = true;
    syncLive();
    if (open) render();
    if (activeTimer) return;
    const startedAt = Date.now();
    const aiAtStart = messages.filter((m) => m.role === "ai").length;
    const tick = async () => {
      await poll();
      const replied = messages.filter((m) => m.role === "ai").length > aiAtStart;
      if ((replied && running.size === 0) || Date.now() - startedAt > 120000) {
        thinking = false;
        activeTimer = null;
        if (open) render();
        schedulePoll();
        return;
      }
      activeTimer = setTimeout(tick, liveUp ? 4000 : 900);
    };
    activeTimer = setTimeout(tick, 600);
  }

  // One fetch at a time; a request for another while one runs fetches once more after it.
  let polling = null;
  let pollAgain = false;
  async function poll() {
    if (polling) {
      pollAgain = true;
      return polling;
    }
    polling = (async () => {
      do {
        pollAgain = false;
        await fetchMessages();
      } while (pollAgain);
    })();
    try {
      await polling;
    } finally {
      polling = null;
    }
  }

  async function fetchMessages() {
    if (!session.conversation_id) return;
    const last = messages.filter((m) => !String(m.id).startsWith("tmp-")).pop();
    try {
      const r = await call("GET", `/conversations/${session.conversation_id}/messages${last ? `?after=${encodeURIComponent(last.created_at)}` : ""}`, null, session.visitor_token);
      const before = messages.length;
      absorb(r);
      for (const tc of r.pending || []) runToolCall(tc);
      if (open && (messages.length !== before || r.status !== status)) render();
      else if (open) render();
    } catch (e) {
      if (e.status === 404) restartSilently();
    }
  }

  // Check for teammate replies while someone is waiting. Live updates bring them the moment they're
  // sent; this poll backs them up: every 3 s with the chat open, 15 s minimized, 30 s while live.
  function schedulePoll() {
    clearTimeout(pollTimer);
    const waiting = status === "needs_human" || status === "human";
    syncLive();
    if (!session.conversation_id || !waiting) return;
    pollTimer = setTimeout(async () => {
      await poll();
      schedulePoll();
    }, liveUp ? 30000 : open ? 3000 : 15000);
  }

  // ───── Live updates ─────
  // While the chat is open or waiting for the team, one streaming request tells the widget when
  // something changed, and it fetches messages as usual. fetch, not EventSource, so the visitor
  // token travels in a header and never in a URL.
  function syncLive() {
    const want = Boolean(session.conversation_id) && (open || thinking || status === "needs_human" || status === "human");
    if (want && !live) listenLive();
    if (!want && live) stopLive();
  }
  /** Shows what the AI is doing; a step that comes sooner than STEP_MS after the last one waits its turn. */
  function showStep(text) {
    const wait = progressAt + STEP_MS - Date.now();
    if (progress && wait > 0) {
      progressNext = text;
      clearTimeout(progressTimer);
      progressTimer = setTimeout(() => {
        if (progressNext && (sending || thinking)) showStep(progressNext);
        progressNext = null;
      }, wait);
      return;
    }
    progress = text;
    progressAt = Date.now();
    if (open) render();
  }

  /** Resolves once the live stream is up, or after `ms` either way. */
  function liveReady(ms) {
    const until = Date.now() + ms;
    return new Promise((done) => {
      const check = () => (liveUp || Date.now() > until ? done() : setTimeout(check, 50));
      check();
    });
  }
  function stopLive() {
    if (live) live.abort();
    live = null;
    liveUp = false;
  }
  async function listenLive() {
    const ctl = (live = new AbortController());
    const conv = session.conversation_id;
    let wait = 2000;
    while (live === ctl && session.conversation_id === conv) {
      try {
        const res = await fetch(`${API}/widget/${KEY}/conversations/${conv}/stream`, { headers: headers(session.visitor_token), signal: ctl.signal, credentials: "omit", cache: "no-store" });
        if (res.status === 404 || !res.body) return void (live === ctl && stopLive());
        if (!res.ok) throw new Error(String(res.status));
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const block = buf.slice(0, i);
            buf = buf.slice(i + 2);
            // What the AI is doing: shown beside its dots until the answer arrives.
            if (/^event: progress$/m.test(block)) {
              try {
                const d = JSON.parse((/^data: (.*)$/m.exec(block) || [])[1] || "{}");
                const steps = STRINGS[LANG].steps || STRINGS.en.steps;
                const text = (d.step === "tool" || d.step === "confirm") && d.label ? String(d.label).slice(0, 80) : steps && steps[d.step];
                if (text && (sending || thinking)) showStep(text);
              } catch {
                // not ours
              }
              continue;
            }
            // A teammate typing: show it for a few seconds, nothing to fetch.
            if (/^event: typing$/m.test(block)) {
              try {
                const d = JSON.parse((/^data: (.*)$/m.exec(block) || [])[1] || "{}");
                teamTyping = { name: d.name, until: Date.now() + 6000 };
                if (open) render();
                setTimeout(() => open && render(), 6100);
              } catch {
                // not ours
              }
              continue;
            }
            // "ready" (fetch whatever changed while connecting) or a change: either way, fetch.
            if (!/^(event|data):/m.test(block)) continue;
            if (!liveUp) {
              liveUp = true;
              schedulePoll();
            }
            wait = 2000;
            poll();
          }
        }
      } catch {
        if (ctl.signal.aborted) return;
      }
      if (live !== ctl) return;
      if (liveUp) {
        liveUp = false;
        schedulePoll(); // back to the quick poll until the stream returns
      }
      await new Promise((r) => setTimeout(r, wait));
      wait = Math.min(wait * 2, 30000);
    }
  }

  function restartSilently() {
    stopLive();
    clearPending();
    session = {};
    save(session);
    messages = [];
    status = "ai";
  }
  function restart() {
    // The team sees that the visitor left this chat for a new one.
    const previous = session.conversation_id ? { id: session.conversation_id, token: session.visitor_token } : null;
    if (previous) call("POST", `/conversations/${previous.id}/leave`, {}, previous.token).catch(() => {});
    restartSilently();
    if (previous) {
      session = { previous };
      save(session);
    }
    clearTimeout(pollTimer);
    render();
    input.focus();
  }

  // ───── Start ─────
  (async function start() {
    try {
      config = await call("GET", `/config?lang=${encodeURIComponent(LANGUAGE)}`);
    } catch (e) {
      return console.warn(`[Replybek] Chat not shown: ${e.message}`);
    }
    config.suggestions = config.suggestions || [];
    host.style.setProperty("--w-accent", /^#[0-9a-f]{6}$/i.test(config.accent) ? config.accent : "#111215");
    title.textContent = config.display_name;
    avatar.textContent = initials(config.display_name);
    // The logo is a data: URL saved in the dashboard; if the host page's CSP blocks it, initials stay.
    if (/^data:image\/[\w.+-]+;base64,/.test(config.logo || "")) {
      const img = h("img", { src: config.logo, alt: "" });
      img.addEventListener("load", () => {
        avatar.textContent = "";
        avatar.classList.add("has-logo");
        avatar.append(img);
      });
    }
    brand.hidden = !config.branding;
    if (typeof ResizeObserver === "function") new ResizeObserver(fitBrand).observe(brand.parentElement);
    launcher.setAttribute("aria-label", t("chatWith", { name: config.display_name }));
    launcher.hidden = NO_LAUNCHER;
    root.append(panel, launcher);
    document.body.append(host);
    // The page can open the chat from its own button.
    window.Replybek = {
      open: () => toggle(true),
      close: () => toggle(false),
      toggle: () => toggle(),
      unread: () => unseen,
      // A signed-in page says who the visitor is; the team sees it in the Inbox.
      identify(info = {}) {
        who = visitorInfo(info);
        if (session.conversation_id && Object.keys(who).length) call("POST", `/conversations/${session.conversation_id}/visitor`, who, session.visitor_token).catch(() => {});
      },
      // Signing out: forget this chat in this browser, so the next person doesn't see it.
      reset() {
        if (open) toggle(false);
        restartSilently();
        who = null;
        unseen = 0;
        badge.hidden = true;
        announceUnread();
      },
    };
    window.dispatchEvent(new CustomEvent("replybek:ready"));
    // Pick up an earlier conversation from this browser.
    if (session.conversation_id) {
      await poll();
      schedulePoll();
    }
    // The team can see the visitor is here: a check-in now, every 30 s while the page is visible,
    // and when they come back to it.
    const checkIn = () => {
      if (session.conversation_id && document.visibilityState === "visible") call("POST", `/conversations/${session.conversation_id}/presence`, {}, session.visitor_token).catch(() => {});
    };
    checkIn();
    setInterval(checkIn, 30000);
    document.addEventListener("visibilitychange", checkIn);
  })();
})();
