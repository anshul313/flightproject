var SNS = require('sns-mobile');

// var ANDROID_ARN = 'arn:aws:sns:ap-southeast-1:552905730771:app/GCM/QyklyApp';
// var APNS_ARN = '';
var sns = {};

sns.getARN = function(pushToken, platform, done) {

	var AndroidARN = new SNS({
		platform: 'android',
		region: 'ap-southeast-1',
		apiVersion: '2010-03-31',
		accessKeyId: 'AKIAJPFKQ6DYJVOHFFKA',
		secretAccessKey: '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',
		platformApplicationArn: 'arn:aws:sns:ap-southeast-1:552905730771:app/GCM/qyklyproduction'
	});

	// var iOSARN = new SNS({
	// 	platform: SNS.SUPPORTED_PLATFORMS.IOS,
	// 	region: 'ap-southeast-1',
	// 	apiVersion: '2010-03-31',
	// 	accessKeyId: config.amazon.accessKeyId,
	// 	secretAccessKey: config.amazon.secretAccessKey,
	// 	platformApplicationArn: APNS_ARN,
	// 	sandbox: (process.env.ENV == 'production') ? true : false
	// });
	if (platform == "android") {
		console.log('generate endpoint : ', pushToken);
		AndroidARN.addUser(pushToken, null, function(err, endpointArn) {
			done(err, endpointArn);
		});
	} else {
		iOSARN.addUser(pushToken, null, function(err, endpointArn) {
			done(err, endpointArn);
		});
	}
}


module.exports = sns;
