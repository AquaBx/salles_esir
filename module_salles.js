const axios = require('axios');

var link = {
    "amphi-l":"https://planning.univ-rennes1.fr/jsp/custom/modules/plannings/KYNvDgYv.shu",
    "amphi-m":"https://planning.univ-rennes1.fr/jsp/custom/modules/plannings/V3LwD2WA.shu",
    "amphi-n":"https://planning.univ-rennes1.fr/jsp/custom/modules/plannings/XnmgOl3r.shu",
    "salle-001":"https://planning.univ-rennes1.fr/jsp/custom/modules/plannings/pn82LL38.shu",
    "salle-002":"https://planning.univ-rennes1.fr/jsp/custom/modules/plannings/qnqPZBYJ.shu",
    "salle-003":"https://planning.univ-rennes1.fr/jsp/custom/modules/plannings/o356qeYR.shu",
    "salle-004":"https://planning.univ-rennes1.fr/jsp/custom/modules/plannings/KW74qA3M.shu",
    "salle-101":"https://planning.univ-rennes1.fr/jsp/custom/modules/plannings/134B51nk.shu",
    "salle-102":"https://planning.univ-rennes1.fr/jsp/custom/modules/plannings/ynAw4b3w.shu",
    "salle-103":"https://planning.univ-rennes1.fr/jsp/custom/modules/plannings/E3ejzdY5.shu",
    "salle-104":"https://planning.univ-rennes1.fr/jsp/custom/modules/plannings/OnE5qdnr.shu"
}

var salles = ["amphi-l","amphi-m","amphi-n","salle-001","salle-002","salle-003","salle-004","salle-101","salle-102","salle-103","salle-104"]

var name = {
    "amphi-l":"Amphi L",
    "amphi-m":"Amphi M",
    "amphi-n":"Amphi N",
    "salle-001":"Salle 001",
    "salle-002":"Salle 002",
    "salle-003":"Salle 003",
    "salle-004":"Salle 004",
    "salle-101":"Salle 101",
    "salle-102":"Salle 102",
    "salle-103":"Salle 103",
    "salle-104":"Salle 104"
}

function to_date(char){
    var year = char.slice(0,4)
    var month = char.slice(4,6)
    var day = char.slice(6,8)
    var hour = char.slice(9,11)
    var minute = char.slice(11,13)
    var sec = char.slice(13,15)
    var date = new Date(Date.UTC(year,parseInt(month)-1,day,parseInt(hour),minute,sec))
    return date.getTime()
}

function dichotomie(liste,datetime,a,b){
    if (b-a == 1){
        var test1 = to_date(liste[a]["DTEND"]) < datetime
        var test2 = datetime < to_date(liste[b]["DTSTART"])

        if (test1 && test2){
            return [true,b]
        }
        else{
            return [false,a]
        }
         
    }
    var m = Math.floor((b+a)/2)
    if (datetime < to_date(liste[m]["DTSTART"])) {
        return dichotomie(liste,datetime,a,m)
    }
    else{
        return dichotomie(liste,datetime,m,b)
    }
}

function parse(data) {
    var data = data.split(" \r\n ").join("");
    data = data.split("\r\n ").join("");
    data = data.split(" \r\n").join("");
    data = data.split("\r\n");

    var obj =  [];
    var push =  {};
    for (var cle in data) {
        var valeur = data[cle]
        var split = valeur.split(':');
        var nkey = split[0];
        
        var nvalue = split.slice(1).join(" ");
        if (nkey == "BEGIN" && nvalue != "VCALENDAR"){
            push =  {};
        }
        else if (nkey == "END" && nvalue != "VCALENDAR"){
            obj.push(push);
        }
        else if (nkey == "END" && nvalue == "VCALENDAR"){
            break;
        }
        else if (nkey == "END" && nvalue == "VCALENDAR"){
            break;
        }
        else{
            push[nkey] = nvalue;
        }
    }
    return obj;
}

async function request(url){
    const resp = await axios.get(url);
    return resp.data;
};

async function get_cal(url){
    var resp = await request(url);
    var cal = parse(resp)
    cal.sort((a, b) => (a.DTEND > b.DTSTART) ? 1 : -1)
    return cal
}

async function salleLibres(salle,date=Date.now()){
    /*
        Retourne si la salle est libre (true) ou non (false) sur 

        date est par d??faut Date.now()

        Args : 
            - salle : string
            - date : int (UNIX time)
        Return :
            - return.state : bool??en : ??tat de la salle ( libre : true , occup?? : false )
            - return.until : int : date de fin de l'??tat (UNIX time)
    */
    var url = link[salle]
    var cal = await get_cal(url);
    var req = dichotomie(cal,date,0,cal.length)
    var state = req[0]    
    var i = req[1]
    
    if (state){
        var jusque = cal[i]["DTSTART"]
    }
    else{
        var jusque = cal[i]["DTEND"]
    }
    return {"state":state,"until":to_date(jusque)}
}

async function salleEvents(salle,date){
    /*
        Retourne les horaires des cours/events d'une journ??e donn??e dans une salle donn??e
        
        Args:
            - salle : string
            - date : int (UNIX time)
        return : 
            - liste des events d'une journ??e
    */
    var url = link[salle]
    var cal = await get_cal(url);
    var req = dichotomie(cal,date,0,cal.length)  
    var i = req[1]

    var liste = []
    while (to_date(cal[i]["DTEND"]) < date + 24*60*60*1000){
        liste.push(cal[i])
        i+=1
    }
    return liste
}

function convert_unix_to_local(unix,local="fr-FR"){
    var date = new Date(unix)
    return date.toLocaleDateString(local, {weekday: "long", day: "numeric", hour: "numeric", minute: "numeric"})
}

async function main(){
    console.log("Salles Libres")
    for (var salle of salles){
        var resp = await salleLibres(salle)
        console.log(salle, "Libre ?",resp.state, convert_unix_to_local(resp.until));
    }
    console.log("Salles Events")
    for (var salle of salles){
        var date = new Date(Date.UTC(2022,0,10))
        date = date.getTime()
        var resp = await salleEvents(salle,date)
        console.log(salle, resp);
    }
}

//main()

exports.salleLibres = salleLibres;
exports.salleEvents = salleEvents;
exports.convert_unix_to_local = convert_unix_to_local;
exports.salles = salles
exports.salles_links = link
exports.salles_names = name
