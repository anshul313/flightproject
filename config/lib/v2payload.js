var requied = {
	"link": ['image', 'link'],
	"share-action": ['shareMessage']
}


var arnType = {
	"my-post": {
		"action": "my-post",
		"message": '',
		"heading": '',
		"data": {},
		"alert": ''
	},
	"link": {
		"action": "link",
		"message": '',
		"heading": '',
		"data": '',
		"alert": ''
	},
	"compose-post": {
		"action": "compose-post",
		"message": '',
		"heading": '',
		"data": {},
		"alert": ''
	},
	"homefeed": {
		"action": "homefeed",
		"message": '',
		"heading": '',
		"data": {},
		"alert": ''
	},
	"share-action": {
		"action": "share-action",
		"message": '',
		"heading": '',
		"data": {},
		"alert": ''
	}
}

var getPayload = function(activity, os) {
	// arnType[activity.action].heading = activity.heading;
	// arnType[activity.action].data = activity.data;

	// arnType[activity.action].alert = arnType[activity.action].message = activity.message;

	// if (activity.image)
	// 	arnType[activity.action].image = activity.image

	// if (activity.link)
	// 	arnType[activity.action].link = activity.link

	// if (activity.shareMessage)
	// 	arnType[activity.action].shareMessage = activity.shareMessage

	// if (os === 'Android')
	// 	delete arnType[activity.action].alert;
	// if (os === 'iOS')
	// 	delete arnType[activity.action].message;

	return activity;
	//	return arnType[activity.action];
};

module.exports = {
	exec: getPayload,
	requied: requied
};