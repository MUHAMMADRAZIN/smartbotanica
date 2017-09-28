var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var cfenv = require("cfenv");
var bodyParser = require('body-parser');
var nodedatetime = require('node-datetime');

process.env.TZ = 'Asia/Kuala_Lumpur';

var project_value = "";
var trigger_value = "";
var sensor_value = "";

var dt;
var current_timestamp;

/* Connect with cloudant*/
var mydb = "";

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use(express.static('public'));

app.get('/', function(req, res, next) {
	res.sendFile(__dirname + '/public/index.html');
});

app.post('/loadlog', function(req, res, next) {
	
	project_value = req.body.project_value;
	
	checkDBstatus(project_value);
		
	if(!mydb) {
		return;
	}

	var rowdata = "";
	mydb.list({ include_docs: true }, function(err, body) 
	{
		if (!err) 
		{
			body.rows.forEach(function(row) 
			{
				rowdata += "<tr><td width='38%'>"+row.doc.current_timestamp+"</td><td width='32%'>"+row.doc.soil_moistness+"</td><td width='30%'>"+row.doc.trigger_value+"</td></tr>";
			});
			
			res.send(rowdata);
		}
	});
});

io.on('connection', function(client) {
	//console.log('Client connected...');

	client.on('join', function(data) {
		//console.log(data);
	});

	var rowdata = "";
	client.on('trigger_parameter', function(data){
		
		var parameter_array = data.split('##');
		
		project_value = parameter_array[0];
		trigger_value = parameter_array[1];
		sensor_value = parameter_array[2];

		dt = nodedatetime.create();
		current_timestamp = dt.format('Y-m-d H:M:S');
		
		if(trigger_value != "Read Sensor")
		{
			if(trigger_value != "Check Sensor")
			{
				sensor_value = "-";
			}
			
			checkDBstatus(project_value);
		  
			if(!mydb) {
				console.log("No database.");
				return;
			}
			//insert to database
			mydb.insert({"current_timestamp" : current_timestamp, "soil_moistness" : sensor_value, "trigger_value" : trigger_value}, function(err, body, header) {
				if (err) {
				  return console.log('[mydb.insert] ', err.message);
				}
			});
			
			rowdata = current_timestamp+"##"+sensor_value+"##"+trigger_value;
		}
		else
		{
			rowdata = current_timestamp+"##Processing##"+trigger_value;
		}

		client.emit('thread', rowdata);
		client.broadcast.emit('thread', rowdata);
	});
});

/* Connect with cloudant*/
// load local VCAP configuration  and service credentials
var vcapLocal;
var cloudant;

function checkDBstatus(pass_db)
{
	try {
	  vcapLocal = require('./vcap-local.json');
	  //console.log("Loaded local VCAP", vcapLocal);
	} catch (e) { }

	const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}

	const appEnv = cfenv.getAppEnv(appEnvOpts);

	if (appEnv.services['cloudantNoSQLDB']) {
	  // Load the Cloudant library.
	  var Cloudant = require('cloudant');

	  // Initialize database with credentials
	  cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);

	  //database name
	  var dbName = pass_db;

	  // Create a new database if not exist.
	  cloudant.db.create(dbName, function(err, data) {
		if(!err) //err if database doesn't already exists
		  console.log("Created database: " + dbName);
	  });

	  // Specify the database we are going to use (smartbotanica)...
	  mydb = cloudant.db.use(dbName);
	}
}

var port = process.env.PORT || 7777;
server.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
});