"use strict";

import { STATUS_CODES } from "http";

/*
 * Created with @iobroker/create-adapter v2.4.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");

// Load your modules here, e.g.:
// const fs = require("fs");

class PresenceSimulation extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "presence-simulation",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here
		// Reset the connection indicator during startup
		this.setState("info.connection", false, true);
		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		this.log.error("Die Gruppe 1 beginnt um" + this.config.grp1_start);
		this.log.error("Die Gruppe 1 geht bis" + this.config.grp1_ende);
		this.log.info("Es wurden so viele Geräte 1 ausgewählt: " + this.config.grp1_anzahl);
		this.log.info("Es wurden so viele Geräte 2 ausgewählt: " + this.config.grp2_anzahl);
		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean letiable named "testletiable"
		Because every adapter instance uses its own unique namespace letiable names can't collide with other adapters letiables
		*/
		await this.setObjectNotExistsAsync("testletiable", {
			type: "state",
			common: {
				name: "testletiable",
				type: "boolean",
				role: "indicator",
				read: true,
				write: true,
			},
			native: {},
		});
		await this.setObjectNotExistsAsync("anwesenheitserkennung_aktiv", {
			type: "state",
			common: {
				name: "anwesenheitserkennung_aktiv",
				type: "boolean",
				role: "state",
				read: true,
				write: true,
			},
			native: {},
		});

		// In order to get state updates, you need to subscribe to them. The following line adds a subscription for our letiable we have created above.
		this.subscribeStates("testletiable");
		this.subscribeStates("anwesenheitserkennung_aktiv");
		// You can also add a subscription for multiple states. The following line watches all states starting with "lights."
		// this.subscribeStates("lights.*");
		// Or, if you really must, you can also watch all states. Don't do this if you don't need to. Otherwise this will cause a lot of unnecessary load on the system:
		// this.subscribeStates("*");

		/*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
		*/
		// the letiable testletiable is set to true as command (ack=false)
		await this.setStateAsync("testletiable", true);
		//await this.setStateAsync("anwesenheitserkennung_aktiv", false);
		// same thing, but the value is flagged "ack"
		// ack should be always set to true if the value is received from or acknowledged from the target system
		await this.setStateAsync("testletiable", { val: true, ack: true });
		await this.setStateAsync("anwesenheitserkennung_aktiv", {val:false,ack: true});


		// same thing, but the state is deleted after 30s (getState will return null afterwards)
		//await this.setStateAsync("testletiable", { val: true, ack: true, expire: 30 });

		// examples for the checkPassword/checkGroup functions
		let result = await this.checkPasswordAsync("admin", "iobroker");
		this.log.info("check user admin pw iobroker: " + result);

		result = await this.checkGroupAsync("admin", "admin");
		this.log.info("check group user admin group admin: " + result);
		
			//..........Anwesenheitssimulation AWS Version 0.80
//..........Datum: 28.12.2015
//..........Autor: Looxer01
//..........Forum ioBroker
//..........http://forum.iobroker.com/posting.php?mode=post&f=21&sid=b3b2a31dae55081fedaf0ad9c8d74acd
//
//..........Änderungshistorie
//..........Version 0.10 Initial 28.12.2015
//..........Version 0.11 29.12.2015 Einstellungen um Astrozeiten erweitert (noch ohne Funktion)
//.........,Version 0.12 29.12.2015 EVENT Deaktivierung von AWS hinzugefügt: Schreiben Log und loeschen Schedules
//...............................................Aktivierung von AWS hihzugüfügt: Schreiben Log bei Aktivierung
//..........Version 0.13 29.12.2015 das Schreiben des externen Logs optional gemacht - unter Einstellungen auswaehlbar
//..........Version 0.20 29.12.2015 Astrozeit Funktion hinzugefügt. Astrozeit wird je IDGruppe auf true/false gesetzt und overruled die letiablen zeit1von,zeit2von,zeit3von,zeit4von,zeit5von
//..........Version 0.30 29.12.2015 Umarbeitung zur Verkürzung des Scripts
//..........Version 0.31 30.12.2015 Fehlerbeseitigung in IDGruppen3 und 4 - einige Code Hygiene Massnahmen
//..................................Umbenennung der IDGruppen mit führend "ID" / Startverzögerungseinstellungen hinzugefügt
//..........Version 0.32 30.12.2015 umgestellt auf setStateDelayed / Startverzögerungsfunktion hinzugefügt.
//..........Version 0.33 31.12.2015 Fehler mit EVAL Funktion gefixt / Fehler mit Startverzoegerung und Einschaltzeiten gefixt
//..................................Funktion Anzahl von Geraete Teilnehmer zur Geraete ID bestimmung hinzugefügt
//..........Version 0.40 01.01.2016 Log-Pfad letiablel gemacht // Log-File Format umgearbeitet und Headerline hinzugefügt fuer externes Log. Internes Log ueberarbeitet
//..........Version 0.41 02.01.2016 Funktionen von Baetz zum TimeInRange Check hinzugefuegt. Keine Globale Funktion mehr notwendig. -- Kommentarte ueberarbeitet
//..........Version 0.42 02.01.2015 Herkunftsnachweis für IsTimeInRange Funktion hinzugefuegt
//..................................Fehler zur zufaelligen Geraete Findung behoben. Das letzte Geraet wurde nie ausgewaehlt // Fehler im log "Gearaet wurde nicht eingeschaltet wurde gelogged auch wenn es eingeschaltet wurde"
//..........Version 0.43 03.01.2015 Wenn AWS auf inaktiv gesetzt wird, dann werden alle teilnehmenden Geraete ausgeschaltet -  Dokumentation der letiablen / letiablen deklaration nachgeholt fuer zwei Faelle
//..........Version 0.44 04.01.2015 Addieren der Einschaltverzoegerung zur Ausschaltzeit fuer die Ausschaltzeitberechnung // Fixed Fehler doppelte Schaltung fuer STATE geraete
//..........Version 0.45 04.01.2015 weiterer Fehler zur Berechnung der Ausschaltzeit korrigiert
//..........Version 0.50 04.01.2015 Beseitigung unnötiges Coding // Ueberpruefung ob Geraet existiert hinzugefuegt - LogMeldung falls nicht hinzugefuegt. - kein Javascript restart mehr, wenn geraet nicht existiert
//..........Version 0.60 04.01.2015 Ausschalten der Teilnehmer bei Deaktivierung optimiert. Ausschaltung optional gemacht / Astrozeit ueberarbeitet
//..................................Astrozeit auch fuer die bis Zeit hinzugefuegt. Damit lassen sich Schaltungen bis zum Sonnenaufgang umsetzen / weitere Codeoptimierungen
//..........Version 0.61 05.01.2015 Beim  Ausschalten Verzoegerung zwischen Schaltvorgange eingebaut  / Codeiptimierung bei den Gruppen Schedules / Fehler bei der  GrpZufAnz und StartDelay beseitigt fuer Gruppen 2-5
//..........Version 0.65 06.01.2015 Reaktion bei bereits eigneschalteten Lampen letiabel gemacht / Codeoptimierungen / ID fuer AWS-Aktiv ist jetzt letiabel
//..........Version 0.70 26.01.2015 SetStateDelayed ist jetzt in javascript gefixt ab JS version 1.1.2 - Das Loeschen von Ein/Auschaltplanungen wird jetzt mit dem neuen Befehl clearStateDelayed gemacht
//..................................Vorläufig wurde das Merken der letzten Aktion geloescht, da es keine Verwendung im Moment hat
//..........Version 0.75 27.01.2015 Fehler beim Loeschen von Ein/Auschaltplanungen behoben - Es wurde nicht geloescht, wenn Verbraucher eingeschaltet bleiben sollen
//..........Version 0.80 28.04.2016 Fehler mit der Astrozeit, wenn die BisZeit < ist als die Astrozeit(von) beseitigt


//// Das Script wird aktiviert, wenn das Flag "Anwesenheitssteuerung gesetzt wird"
// HIER Einstellungen vornehmen............................................................................................


// Einstellungen der Aktivzeiten je IDGruppe von bis
let zeit1von = this.config.grp1_start;  //Aktivzeit von IDGruppe1
let zeit1bis = this.config.grp1_ende;  //Aktivzeit bis IDGruppe1

let zeit2von = this.config.grp2_start;  //Aktivzeit von IDGruppe2
let zeit2bis = this.config.grp2_ende;  //Aktivzeit bis IDGruppe2

let zeit3von = this.config.grp3_start;  //Aktivzeit von IDGruppe3
let zeit3bis = this.config.grp3_ende;  //Aktivzeit bis IDGruppe3

let zeit4von = this.config.grp4_start;  //Aktivzeit von IDGruppe4
let zeit4bis = this.config.grp4_ende;  //Aktivzeit bis IDGruppe4

let zeit5von = this.config.grp5_start;  //Aktivzeit von IDGruppe5
let zeit5bis = this.config.grp5_ende;  //Aktivzeit bis IDGruppe5

// Wenn Astrozeit auf true steht, dann wird die vonZeit durch die Astrozeit übersteuert
let vonAstro1 = true ;  // die zeit1von wird ersetzt durch die Astrozeit - wenn auf night - setting ist optional true = Verwendung der Astrozeit - IDGruppe1
let vonAstro2 = false ;  // die zeit1von wird ersetzt durch die Astrozeit - wenn auf night - setting ist optional true = Verwendung der Astrozeit - IDGruppe2
let vonAstro3 = false ;  // die zeit1von wird ersetzt durch die Astrozeit - wenn auf night - setting ist optional true = Verwendung der Astrozeit - IDGruppe3
let vonAstro4 = false ;  // die zeit1von wird ersetzt durch die Astrozeit - wenn auf night - setting ist optional true = Verwendung der Astrozeit - IDGruppe4
let vonAstro5 = false ;  // die zeit1von wird ersetzt durch die Astrozeit - wenn auf night - setting ist optional true = Verwendung der Astrozeit - IDGruppe5



// Wenn bis Astrozeit auf true steht, dann wird die bisZeit durch die Astrozeit übersteuert
let bisAstro1 = true ;  // die zeit1von wird ersetzt durch die Astrozeit -  setting ist optional true = Verwendung der Astrozeit - IDGruppe1
let bisAstro2 = false ;  // die zeit1von wird ersetzt durch die Astrozeit - setting ist optional true = Verwendung der Astrozeit - IDGruppe2
let bisAstro3 = false ;  // die zeit1von wird ersetzt durch die Astrozeit - setting ist optional true = Verwendung der Astrozeit - IDGruppe3
let bisAstro4 = false ;  // die zeit1von wird ersetzt durch die Astrozeit - setting ist optional true = Verwendung der Astrozeit - IDGruppe4
let bisAstro5 = false ;  // die zeit1von wird ersetzt durch die Astrozeit - setting ist optional true = Verwendung der Astrozeit - IDGruppe5


// Einstellungen der zufaelligen Einschaltdauer je IDGruppe von bis
let ein1von = this.config.grp1_an_von;   // Minuten IDGruppe1 von
let ein1bis = this.config.grp1_an_bis;   // Minuten IDGruppe1 bis

let ein2von = this.config.grp2_an_von;   // Minuten IDGruppe2 von
let ein2bis = this.config.grp2_an_bis;   // Minuten IDGruppe2 bis

let ein3von = this.config.grp3_an_von;   // Minuten IDGruppe3 von
let ein3bis = this.config.grp3_an_bis;   // Minuten IDGruppe3 bis

let ein4von = this.config.grp4_an_von;   // Minuten IDGruppe4 von
let ein4bis = this.config.grp4_an_bis;   // Minuten IDGruppe4 bis

let ein5von = this.config.grp5_an_von;   // Minuten IDGruppe5 von
let ein5bis = this.config.grp5_an_bis;   // Minuten IDGruppe5 bis


// Einstellung je Gruppe für die  maximale  Startverzögerung in Minuten
// bei 0 = keine Startverzögerung - bei z.B. 10 = Startverzögerung zwischen 0 und 10 in Minuten
//
let StartDelay1 = this.config.grp1_delay;   // Maximale Startverzoegerung Gruppe1
let StartDelay2 = this.config.grp2_delay;   // Maximale Startverzoegerung Gruppe2
let StartDelay3 = this.config.grp3_delay;   // Maximale Startverzoegerung Gruppe3
let StartDelay4 = this.config.grp4_delay;   // Maximale Startverzoegerung Gruppe4
let StartDelay5 = this.config.grp5_delay;   // Maximale Startverzoegerung Gruppe5




// Einstellung Check-schedule  - Voreinstellung z.B. alle 30  Minuten je IDGruppe - Damit wird je Lauf nach Zufaelligkeit je ein Geraet der IDGruppe eingeschaltet
let cron1 = this.config.grp1_cron;  // checks alle x Minuten für IDGruppe1
let cron2 = this.config.grp2_cron; //  checks alle x Minuten für IDGruppe2
let cron3 = this.config.grp3_cron; //  checks alle x Minuten für IDGruppe3
let cron4 = this.config.grp4_cron; //  checks alle x Minuten für IDGruppe4
let cron5 = this.config.grp5_cron; //  checks alle x Minuten für IDGruppe5



// Einstellung teilnehmende Homematic Geräte je IDGruppe maximal 5 - Eingabe der Homematic ID
//Häufiges ein und aus Durchgangsverkehr
let     IDGruppe11 = "hm-rpc.0.NEQ1660667.2.STATE";  // Esszimmerlicht
let     IDGruppe12 = "hm-rpc.1.000855699C4CAF.4.STATE";  // Treppenhaus EG
let     IDGruppe13 = "hm-rpc.1.000855699C5298.4.STATE";  // Treppenhaus OG
let     IDGruppe14 = "";  // 
let     IDGruppe15 = "";  // 
let     Grp1ZufAnz = 3;              // Anzahl der Geräte zur zufälligen Bestimmung des Geraetes

//Später Abend KInder spielen in Zimmern
let     IDGruppe21 = "g-homa.0.94BC08.state";  // Arbeitsplatte
let     IDGruppe22 = "hm-rpc.0.NEQ1660667.2.STATE";  // Esszimmerlicht 
let     IDGruppe23 = "hm-rpc.0.OEQ1157159.1.STATE ";//Vincent Zimmer 
let     IDGruppe24 = " ";
let     IDGruppe25 = " ";
let     Grp2ZufAnz = 3;              // Anzahl der Geräte zur zufälligen Bestimmung des Geraetes


let     IDGruppe31 =  "hm-rpc.0.NEQ1647232.1.STATE"; // Küche
let     IDGruppe32 =  "";  // 
let     IDGruppe33 =  "";  // 
let     IDGruppe34 = "  ";
let     IDGruppe35 = "  ";
let     Grp3ZufAnz = 1;              // Anzahl der Geräte zur zufälligen Bestimmung des Geraetes


let     IDGruppe41 = "hm-rpc.0.NEQ1647232.1.STATE"; // Küche
let     IDGruppe42 = "hm-rpc.0.NEQ1660667.1.STATE";  // Wohnzimmer;
let     IDGruppe43 = "g-homa.0.94BC08.state";  // Arbeitsplatte 
let     IDGruppe44 = "  ";
let     IDGruppe45 = "  ";
let     Grp4ZufAnz = 3;              // Anzahl der Geräte zur zufälligen Bestimmung des Geraetes


let     IDGruppe51 = "g-homa.0.94BC08.state";  // Arbeitsplatte 
let     IDGruppe52 = "  ";
let     IDGruppe53 = "  ";
let     IDGruppe54 = "  ";
let     IDGruppe55 = "  ";
let     Grp5ZufAnz = 1;              // Anzahl der Geräte zur zufälligen Bestimmung des Geraetes


let logflag = true;     // wenn auf true dann wird das logging in Datei /opt/iobroker/iobroker-data/AWSLog.csv eingeschaltet bei false vice versa

let ausflag = false;     // Wenn AWS deaktiviert wird, dann werden alle Teilnehmer ausgeschaltet


// Ende Einstellungen .......................................................................................................



// Experten-Einstellungen .......................................................................................................

//createState('Anwesenheitssteuerung.AWSAktiv',true);
let IDAWSaktiv = "presence-simulation.0.anwesenheitserkennung_aktiv";     // in den objekten angelegte letiable zur Bestimmung ob AWS aktiv ist - Kann auch ausgetauscht werden durch eine andere
let LogPath = "/opt/iobroker/iobroker-data/AWSLog.csv";             // Pfad und Dateiname des externen Logs
let IgnoreWhenOn = false;                                           // bei true: Ignoriert den Schaltvorgang, wenn das Geraet bereits eingeschaltet war

// Ende Experten-Einstellungen .......................................................................................................


let fs = require('fs');                     // enable write fuer externes log
let cron1job = "* "+cron1+" * * * *";       // CRON pattern aufgrund der Vorgabe in den Einstellungen
let cron2job = "* "+cron2+" * * * *";       // CRON pattern aufgrund der Vorgabe in den Einstellungen
let cron3job = "* "+cron3+" * * * *";       // CRON pattern aufgrund der Vorgabe in den Einstellungen
let cron4job = "* "+cron4+" * * * *";       // CRON pattern aufgrund der Vorgabe in den Einstellungen
let cron5job = "* "+cron5+" * * * *";       // CRON pattern aufgrund der Vorgabe in den Einstellungen
let x = 0;                                  // Geraetenummer der Gruppe, die zufaellig ausgewaehlt wurde
let y = 0;                                  //  Einschaltzdauer aufgrund der Zufallszahl in Millisekunden
let z = 0;                                  // Einschaltverzögerung aufgrund der Zufallszahl
let string = " ";                           // Logstring
let logtext=" " ;                           // Kommentar im log
let objIDGruppe = " ";                      // uebergabe an Funktion der IDGruppe zum Schalten des Geraetes
let SpaceChk = new RegExp(/\s/);            // pattern um zu pruefen ob eine IDGruppe blanks enthaelt

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new PresenceSimulation(options);
} else {
	// otherwise start the instance directly
	new PresenceSimulation();
}
}
}
