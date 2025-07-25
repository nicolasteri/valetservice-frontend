VALET BUSINESS IDEA

1. Obiettivo del Servizio:
Creazione di un software per la gestione di un Valet Service in cui gli operatori gestiscono le richieste dei clienti, utilizzando Tag NFC per identificare il cliente e associare le chiavi del veicolo al numero del tag.
—--------------------------------------------------------------------------------------
2. Workflow Completo:

1. Assegnazione del Tag NFC:

L'operatore assegna un tag NFC unico (Tag N) al cliente che desidera utilizzare il servizio.

Il tag NFC è come un "foglio bianco" numerato univocamente, al quale viene correlato un codice cliente univoco.

Se il cliente è nuovo nel database, viene creato un nuovo codice cliente.

Se il cliente è già nel database, il codice cliente esistente viene caricato nel tag.

Il tag viene fisicamente correlato alle chiavi del cliente, rendendo facile identificare e recuperare le chiavi quando necessario.

2. Invio dell'SMS al Cliente:

Il sistema invia un SMS al cliente contenente:

Il numero del tag assegnato al cliente.

Un link personalizzato con il parametro client_id per riconoscere il cliente nel sistema.

3. Cliente Accede Tramite Link:

Il cliente clicca sul link ricevuto nell'SMS, che lo porta alla pagina di richiesta del veicolo.

Il sistema riconosce il cliente tramite il client_id e carica i suoi dati dal database.

4. Richiesta del Veicolo:

Il cliente conferma la richiesta del veicolo sulla pagina web.

5. Visualizzazione del Numero del Tag nell'App dell'Operatore:

L'operatore vede il numero del tag del cliente che ha richiesto il veicolo nell'app, pronto per essere gestito.

Il numero del tag corrisponde al numero delle chiavi, organizzate in ordine crescente (01-1000), per facilitarne il recupero.

6. Gestione della Richiesta del Veicolo:

L'operatore prende le chiavi dal loro posto numerato, corrispondente al numero del tag.

Il veicolo viene consegnato al cliente, e la richiesta viene chiusa nel sistema.
—---------------------------------------------------------------------------------------







3. Tecnologie e Strumenti:
Flutter: Scegliamo Flutter per lo sviluppo dell'app mobile, essendo facile per principianti con esperienza nel web development.

MySQL su DigitalOcean: Il database sarà ospitato su un server cloud DigitalOcean con MySQL per gestire i dati dei clienti e le richieste.

Twilio: Utilizzeremo Twilio per inviare gli SMS ai clienti, contenenti il numero identificativo del tag e il link per la richiesta del veicolo.

Tag NFC: Il tag è un "foglio bianco" numerato univocamente, collegato dinamicamente a un codice cliente. Ogni volta che il cliente accede al servizio, il tag viene aggiornato con il suo codice univoco.
—---------------------------------------------------------------------------------------

4. Sicurezza e Privacy:
Protezione dei Dati: Implementeremo misure di sicurezza come la cifratura dei dati per proteggere le informazioni personali dei clienti.

Normative sulla Privacy in Texas: Il sistema sarà conforme al Texas Privacy Protection Act (TPPA), HIPAA, e le normative sulla protezione dei dati applicabili in Texas.
