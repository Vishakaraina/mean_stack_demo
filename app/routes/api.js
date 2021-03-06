var User = require('../models/user');
var Story = require('../models/story');


var config = require('../../config');

var jsonwebtoken = require('jsonwebtoken');


var secretKey = config.secretKey;


function createToken(user) {

	var token = jsonwebtoken.sign({
		_id: user._id,
		name: user.name,
		username: user.username
	}, secretKey, {
		expiresIn: '1h'
	});

	return token;
}


module.exports = function(app, express) {


	var api = express.Router();


	//-----------------------------------------------------
	//   SIGNUP
	//-----------------------------------------------------
	api.post('/signup', function(req, res) {

		console.log("signup user...");

		var user = new User({
			name: req.body.name,
			username: req.body.username,
			password: req.body.password
		});

		var token = createToken(user);
		user.save(function(err) {
			if(err) {
				res.send(err);
				return;
			}

			res.json({ success: true, message: 'User has been created !', token: token});

		});


	});

	//-----------------------------------------------------
	//   Get USERS
	//-----------------------------------------------------
	api.get('/users', function(req, res) {

		User.find( {}, function(err, users) {

			if(err) {
				res.send(err);
				return;
			}

			res.json(users);

		});


	});

	//-----------------------------------------------------
	//   LOGIN
	//-----------------------------------------------------
	api.post('/login', function(req, res) {

		User.findOne({
			username: req.body.username
		}).select('user username password').exec(function(err, user) {

			if(err){
			   console.log("[ERROR] login error: " + err);
			   //throw err;
			   res.send({err: err});
			}

			if(!user) {
				res.send({ message: 'User does not exist !'});
			} else if(user) {

				var validPassword = user.comparePassword(req.body.password);

				if(!validPassword) {
					res.json({ message: 'Invalid Password !'});
				} else {
					// login ok

					// create token
					 var token = createToken(user);

					 res.json({
						success: true,
						message: "Successfully login !",
						token: token
					 });
				}
			}

		});

	});


	//-----------------------------------------------------
	//   TOKEN VALIDATION
	// 
	//   This is middleware function with no mount path. 
	//   The function is executed every time the app receives a request.
	//-----------------------------------------------------

	api.use(function(req, res, next){

		console.log("Got some request, validating token !");

		var token = req.body.token || req.params.token || req.headers['x-access-token'];

		if(token) {

			jsonwebtoken.verify(token, secretKey, function(err, decoded){

				if(err) {
					res.status(403).send({success: false, message: "Failed to authenticate user"});
				} else {
					req.decoded = decoded;

					console.log("decoded token: " + JSON.stringify(decoded));

					next();

				} 	
			});
			
		} else {
			res.status(403).send({success: false, message: "No token provided"});
		}

	});//use


	//-----------------------------------------------------
	//   SAVE STORY BY POST REQUEST
    // 
	//   GET ALL USER STORIES BY GET REQUEST
	//-----------------------------------------------------

	api.route('/')

		.post(function(req, res){


			console.log("[INFO] :: creating new story");

			var story = new Story({
				creator: req.decoded._id,
				content: req.body.content
			});

			story.save(function(err) {

				if(err) {
					res.send(err);
					return;
				} 

				res.json({message: "New Story Created !!!", story: story});

			});

		}) // never add a semicolon if you want to chain it !!!

		.get(function(req, res){

			console.log("[INFO] :: getting stories for: " + req.decoded._id);

			Story.find( {creator: req.decoded._id}, function(err, stories) {

				if(err) {
					res.send(err);
					return;
				}

				res.json(stories);

			});


		});


	//-----------------------------------------------------
	//   GET LOGGED IN USER INFO
	//-----------------------------------------------------

	api.get('/me', function(req, res){
		res.json(req.decoded);
	});


	return api;

};//exports