const helper  = require('node-red-viseo-helper');
const request = require('request');

// --------------------------------------------------------------------------
//  NODE-RED
// --------------------------------------------------------------------------


module.exports = function(RED) {
    const register = function(config) {
        RED.nodes.createNode(this, config);
        let node = this;

        this.config = RED.nodes.getNode(config.config);

        start(RED, node, config);

        this.on('input', (data) => { input(node, data, config)  });
    }
    RED.nodes.registerType("facebook-handover", register, {
        credentials: {
            appDestination: { type: "text" }
        }
    });
}

let SECONDARY_APPS = [];

const start = (RED, node, config) => {

    RED.httpAdmin.get('/facebook/handover/secondary_apps', function(req, res) {
        console.log(SECONDARY_APPS);
        res.json(SECONDARY_APPS);
    });

    //get APPS
    request(
        {
            method: "GET",
            url: 'https://graph.facebook.com/v6.0/me/secondary_receivers?fields=id,name&access_token='+node.config.credentials.token,
            headers: {'Content-Type': 'application/json'}
        },
        function (err, response, body) { 
            if (err) {
                node.error(err); 
            } else {
                let result = JSON.parse(body);

                if(result.data) {
                    SECONDARY_APPS = result.data;
                }
            }
        }
    );
}

const input = (node, data, config) => {
    

    let userId       = config.userId || 'user.id';
        userId       = helper.getByString(data, userId, userId);

    let metadata     = config.metadata;

    let secondaryApp = node.credentials.appDestination;

    request(
        {
            method: "POST",
            url: 'https://graph.facebook.com/v6.0/me/pass_thread_control?access_token='+node.config.credentials.token,
            headers: {'Content-Type': 'application/json'},
            body: {
                recipient : { "id" : userId },
                target_app_id : secondaryApp,
                metadata : metadata
            },
            json: true
        }, function(err, response, body) {


            if(err) {
                node.error(err)
                data.error = err.message;
                node.send([undefined, data]);
            }

            try {
                if(body.success) {
                    return node.send([data, undefined]);
                } else {
                    data.error = body.error.message;
                    node.error(body.error);
                }
            } catch(ex) {
                data.error = ex.message;
                node.error(ex)
            }

            node.send([undefined, data]);
        }
    );


}

