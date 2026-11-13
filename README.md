# chromium-aws-tab-groups

Estensione Chromium (Manifest V3) che raggruppa automaticamente le schede della console AWS per account. Funziona su Chrome, Edge, Brave e altri browser basati su Chromium.

## Come funziona

- Sul portale IAM Identity Center (`*.awsapps.com/start`) legge la lista account e salva la mappa `ID account → nome` in `chrome.storage.local`. La mappa resta nel profilo del browser e non è nel repo.
- Quando una scheda della console AWS (`<account>-<sessione>.<regione>.console.aws.amazon.com`) viene aperta o cambia URL, la sposta nel gruppo con il nome dell'account. Se il gruppo non esiste, lo crea.
- Se l'account non è nella mappa, il gruppo usa l'ID account come titolo.
- All'installazione, all'avvio del browser e al clic sull'icona dell'estensione, raggruppa anche le schede già aperte.

## Installazione (sviluppo)

1. Apri `brave://extensions` (o `chrome://extensions`).
2. Attiva "Modalità sviluppatore".
3. Clicca "Carica estensione non pacchettizzata" e seleziona la cartella di questa repo.

Dopo ogni modifica al codice, ricarica l'estensione dalla stessa pagina.

## Stato

Versione iniziale: raggruppamento per account. Il raggruppamento per sessione non è ancora incluso.
