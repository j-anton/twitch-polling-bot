/*
Twitch Chatbot for polling users graphing results and saving contributorship

Todo: debug for 'num10s' cases
Todo: make callback functions robust
Todo: print files to out/filename
Todo: clean up/organize code
Todo: take user defined parameters and store them/load them between runs. 
    ie: print to file => False (doesn't store results)
    ie: default time change => 30s instead of 60s. 
    etc. 
*/
const tmi = require('tmi.js');


// Define configuration options
const opts = {
    options: { debug: true },
    identity: {
       username: "SUPER_POLL_BOT",
        password: "YOURAUTHTOKEN"
    },
    channels: [
        'YOURCHANNELHERE',
    ]
};

const bool_opts_yes = [
                    'yes',
                    'ya',
                    'yea',
                    'si',
                    'yup',
                    'yah'
                    ];

const bool_opts_no = [
                    'no',
                    'nope',
                    'naa', 
                    'na',
                    'nah'
                     ];


//My Account
const my_channel_name = 'sudo_jack';

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

//poll object constructor
function Poll(){
    this.filename = undefined;
    this.plotname = undefined;
    this.flag = false;
    this.duration = 60000;
    this.duration_in_seconds = this.duration/1000;
    this.duration_in_mins = this.duration/60000;
    this.countdown = this.duration_in_seconds;
    this.start_time = undefined;
    this.current_time = undefined;
    this.end_time = undefined;
    this.poll_fields = undefined;
    this.poll_type = 'bool';
    this.date = Date();
    this.comments_list = [];
    this.results = [];
    this.resultsx = [];
    this.resultsy = [];
}
// Create defaul Poll Object
var poll = new Poll();
console.log(poll);

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
    

    if (self) { return; } // Ignore messages from the bot

    
    // Remove whitespace from chat message
    const commandName = msg.trim();
    var commandLine = msg.split(" ");


    // If the command is known, let's execute it
    if (commandName === '!dice') {
        //  const num = rollDice();
        //  client.say(target, `You rolled a ${num}`);
         //console.log('DEBUG: Target: '+target+' Context: '+context+' self: '+self);
          //console.log(JSON.stringify(context, null, 4));
        console.log(`* Executed ${commandName} command`);
    } 
    // Sets Poll Values from User Inputs
    else if(context.username === my_channel_name && commandLine.includes('poll')) {
        if(poll.flag){ return;} //only run 1 poll at a time

        //set Poll flag TRUE
        poll.flag = setFlag(poll.flag);
        console.log('DEBUG: POLL :' +poll.flag);

        //Set pollname and filename
        commandLine.find(function (element){
            if (element.match(/\(.*\)/)){
                console.log('element: '+element);
                poll.plotname = tmp.toLocaleDateString().replace(/\//g, '_')
                                + '_'+ Date.now()+'_' + element.replace(/[\(\)]/g, '');
                poll.filename = poll.plotname + '.txt';
            }else{
                tmp = new Date();
                poll.plotname = tmp.toLocaleDateString().replace(/\//g, '_') 
                                + '_'+ Date.now();
                poll.filename = poll.plotname + '.txt';
            }
        })


        //Extract Poll Duration
        commandLine.find(function (element){
        console.log('DEBUG: element: ' + element);
        if (element.match(/[\d]+[ms]/)) {
            // Duration in Seconds
            if (element.substring(element.length-1) ==='s'){
                poll.duration = Number(element.substring(0,element.length-1))*1000;
                poll.duration_in_seconds = poll.duration/1000;
                poll.duration_in_mins = poll.duration/60000;

            // Duration in Minutes
            }else {
                poll.duration = Number(element.substring(0,element.length-1))*60000;
                poll.duration_in_seconds = poll.duration/1000;
                poll.duration_in_mins = poll.duration /60000;
            }
            return element;
        }
        }); console.log('DEBUG: duration: ' + poll.duration);

        //Extract Poll Type
        commandLine.find(function (element){
         //   console.log('DEBUG: element: ' + element);
            if (element.match('bool')) {
              //  console.log('DEBUG: Match!: ' + element);
                poll.poll_type = element;
                // return element;
            } else if (element.match(/num[0-9]+/)){
              //  console.log('DEBUG: Match!: ' + element);
                poll.poll_fields = Number(element.substring(3));
                //console.log('DEBUG: poll_fields: ' + poll.poll_fields);
                poll.poll_type='num';
                // return element;
            }
        }); console.log('DEBUG: poll_type: '+ poll.poll_type);

        //Initialize The Polls Timer
        initPollTimer();
        console.log(poll);

        //Run Poll Countdown 
        runPoll(target);

    } else {
        // Load the vote
        if (poll.flag) {
            var vote = getVote(vote, msg);
            console.log(vote);
            if (vote != undefined){
                console.log('VOTE NOT NULL)');
                var tuple = [context.username, vote, msg];
                var username_present = false;
                for (var key in poll.comments_list){
                    if (poll.comments_list[key][0] === context.username){
                        if (poll.poll_type === 'bool') poll.comments_list[key][1] = vote;
                        else poll.comments_list[key][1] = Number(vote);
                        poll.comments_list[key][2] = msg;
                        username_present = true;
                    }
                }
                if (!username_present){
                    poll.comments_list.push(tuple);
                }
            } console.log(poll);
       }
    }
}


// Function called when the "dice" command is issued
function rollDice () {
  const sides = 6;
  return Math.floor(Math.random() * sides) + 1;
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

function initPollTimer () {
    poll.date = Date();
    poll.start_time = Date.now();
    poll.end_time = Date.now() + poll.duration;
    console.log(poll);
}


function runPoll(target){
    poll.current_time = Date.now();
    poll.countdown = Math.ceil((poll.end_time - poll.current_time)/1000);
    client.say(target, 'POLL STARTED: ' + poll.countdown +'s remaining');
    var intervalId = setInterval(function() {
        poll.current_time = Date.now();
        poll.countdown = Math.ceil((poll.end_time - poll.current_time)/1000);

        // HANDLE THE END OF THE POLL
        if (poll.countdown <= 0) {
            clearInterval(intervalId);
            //console.log('DEBUG: POLL OVER');
            client.say(target, 'POLL COMPLETED');
            
            //set Poll flag FALSE
            poll.flag = setFlag(poll.flag);
            console.log('DEBUG: POLL STATUS:' +poll.flag);
            
            // Organize the data in poll object
            if (poll.poll_type === 'bool'){
                poll.results = [['Yes',0],['No',0]];
                poll.resultsx = ['Yes', 'No'];
                poll.resultsy = [0,0];
                for (var key in poll.comments_list){
                    if (poll.comments_list[key][1].toLowerCase() === 'yes'){
                        poll.results[0][1]++;
                        poll.resultsy[0]++;
                    }else{
                        poll.results[1][1]++;
                        poll.resultsy[1]++;
                    }
                }
            }else { 
                poll.results = Array(poll.poll_fields).fill([0,0]);
                poll.resultsy = Array(poll.poll_fields).fill(0);
                for (var key in poll.results){
                    poll.results[key] = [Number(key)+1, 0];
                    poll.resultsx[key] = [Number(key)+1];
                } 
                for (var key in poll.comments_list){
                    poll.results[ poll.comments_list[key][1]-1 ] [1]++ ;
                    poll.resultsy[poll.comments_list[key][1]-1]++;
                }
            }
            
            //poll.results =>>> [[1,Number of 1s],...,[10, Number of 10s]]

            console.log('DEBUG FINAL POLL RESULTS: ', poll);
            results = [[],[]];
            plotPoll(this.filename, results);

            //Save poll results to file
            savePollResults();

            //clearing Poll            
            rmPoll();
            console.log('DEBUG: Cleared Poll:', poll);

            return;
        }
        client.say(target, 'POLL ONGOING: ' + poll.countdown +'s REMAINING');
    }, 2000); //Poll Update Timer
  
}

function rmPoll(){
    poll = new Poll();
}

function savePollResults(){
    var fs = require('fs');
    console.log('DEBUG: savePollResults(): ', poll.comments_list);
    fs.writeFile(poll.filename, JSON.stringify(poll,null, 4), function(err) {
        if (err) {
           return console.error(err);
        }
    });
}

function setFlag (flag){
  return flag = !flag;
}

function getVote(vote, msg){
    if (poll.poll_type === 'bool'){
        return msg.toLowerCase().split(' ').find(function (element){
            if ( bool_opts_yes.indexOf(element) != -1){
              //  console.log('ITS A BOOL YES VOTE!: ' + element);
                return 'Yes';
            } else if ( bool_opts_no.indexOf(element) != -1){
            //console.log('ITS A BOOL No VOTE!: ' + element);
            return 'No';
            }
        });
        
    }else if (poll.poll_type ==='num'){
        var message = msg.split(' ');
        var vote = message.find(function (element){
            var tmp_vote = parseInt(element);
            if ( !isNaN(tmp_vote) && tmp_vote <= poll.poll_fields && tmp_vote > 0){
                //console.log('DEBUG: tmp_vote' tmp_vote);
                return true;
            } 
        });
        console.log('DEBUG: getVote: '+vote);
        if (vote === undefined){
            return undefined;
        }
        return parseInt(vote);

    }
    //return null;
}

function plotPoll(){

    var plotly = require('plotly')('sudo_jack', 'Ti9IYXBl3QjU9DU5nVHH')

    var trace = {
        x: poll.resultsx,
        y: poll.resultsy,
        type: 'bar',
        marker: {
           color: poll.resultsy,
           colorscale: 'Viridis',
        }
    };
    var data = [trace];

    var layout = {fileopt : "overwrite", filename : poll.plotname, color:'rgb(8,48,107)'};

    plotly.plot(data, layout, function (err, msg) {
        if (err) return console.log(err);
        console.log(msg);
    });


    const open = require('open');
    open('https://chart-studio.plotly.com/organize/home/');

}