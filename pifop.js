
// Runtime environment: where is this script running?
//----------------------------------------------------
let RUNTIME_ENVIRONMENT = undefined;

if (typeof window !== 'undefined') {
    RUNTIME_ENVIRONMENT = "browser";
} else if (typeof global !== "undefined") {
    RUNTIME_ENVIRONMENT = "node";
} else {
    console.error("Error: unknown runtime environment. Supported environments: browser and node.");
}

// Polyfills
//-----------
let Request = null;
let fetch = null;

if (RUNTIME_ENVIRONMENT == "node") {
    let nodefetch = require("node-fetch");
    
    Request = class {
        constructor(input, init) {
            if (typeof input == "string") {
                this.input = input;
                Object.assign(this, init);
            } else {
                Object.assign(this, JSON.parse(JSON.stringify(input)));
            }
        }
    };
    
    fetch = function(resource, options) {
        if (typeof resource == "string") {
            return nodefetch(resource, options);
        } else {
            return nodefetch(resource.input, resource);
        }
    }
} else if (RUNTIME_ENVIRONMENT == "browser") {
    Request = window.Request;
    fetch = window.fetch;
}

// PIFOP Module
//--------------
function PIFOPModule() {
    let pifopEndpoint = "func.pifop.com";
    
    if (RUNTIME_ENVIRONMENT == "browser" && location.hostname == "localhost") {
        pifopEndpoint = "localhost:3445";
    }
    
    function setPIFOPEndpoint(host) {
        pifopEndpoint = host;
        
        if (RUNTIME_ENVIRONMENT == "node" && pifopEndpoint.startsWith("localhost")) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        }
    }
    
    function getObjectType(operation) {
        let executionOperations = ["execution_initialization", "input_upload", "execution_start", "execution_stop", "execution_info_retrieval", "output_retrieval", "execution_termination"];
        let functionOperations = ["function_initialization"];
        let apiKeyOperations = ["new_key_created"];
        
        if (executionOperations.includes(operation)) return "execution";
        if (functionOperations.includes(operation)) return "function";
        if (apiKeyOperations.includes(operation)) return "api_key";
        return undefined;
    }
    
    let OperationSuccessEventType = {
        function_initialization: "function_initialized",
        execution_initialization: "execution_initialized",
        input_upload: "input_uploaded",
        execution_start: "execution_started",
        execution_stop: "execution_stopped",
        execution_info_retrieval: "execution_info",
        output_retrieval: "output_retrieved",
        execution_termination: "execution_terminated",
        new_key: "new_key_created"
    };
    
    function forgetExecution(execution) {
        let func = execution.func;
        
        for (i in func.executions) {
            if (func.executions[i] == execution) {
                func.executions.splice(i, 1);
                break;
            }
        }
    }
    
    function internalEventListener(event) {
        let execution = event.execution;
        let func = event.func;
        let ended = false;
        
        switch(event.type) {
          case "function_initialized": {
            func.config = event.data;
            func.initialized = true;
          } break;
          
          case "execution_initialized": {
            execution.data = event.data;
            execution.id = event.data.id;
            execution.endpoint = `https://${pifopEndpoint}/${execution.func.author}/${execution.func.id}/executions/${execution.id}`;
            execution.initialized = true;
            execution.apiKey = func.apiKey;
          } break;
          
          case "execution_info": {
            let currentStatus = execution.data.status;
            execution.data = event.data;
            if (execution.data.status == "ended" && execution.data.status != currentStatus) {
                ended = true;
            }
          } break;
          
          case "output_retrieved": {
            execution.output[event.data.id] = event.data;
          } break;
          
          case "execution_terminated": {
            forgetExecution(execution);
          } break;
          
          case "error": {
            let msg = `Error: Operation '${event.operation}' has failed.`;
            if (event.data.errorMessage) {
                msg += ` Reason: ${event.data.errorMessage}`;
            }
            console.error(msg);
            
            if (event.objectType == "execution") {
                forgetExecution(execution);
            }
          } break;
          
          default: break;
        }
        
        let readyToStart = ((event.type == "input_uploaded" || event.type == "execution_initialized") && execution.nextInputToUpload >= execution.providedInput.length);
        let resultReady = ((event.type == "execution_ended" && !execution.generatedOutput.length) 
                        || (event.type == "output_retrieved" && execution.nextOutputToDownload >= execution.generatedOutput.length));
        
        if (execution) {
            for (eventListener of execution.eventListeners) {
                if (eventListener.type == event.type || eventListener.type == "any") {
                    eventListener.listener(execution, event);
                }
            }
        }
        
        if (func) {
            for (eventListener of func.eventListeners) {
                if (eventListener.type == event.type || eventListener.type == "any") {
                    eventListener.listener(func, event);
                }
            }
        }
        
        if (event.type == "error" && event.operation == "function_initialization") {
            for (exec of func.executions) {
                for (eventListener of exec.eventListeners) {
                    if (eventListener.type == event.type || eventListener.type == "any") {
                        eventListener.listener(exec, event);
                    }
                }
            }
        }
        
        if (ended) {
            if ("output" in event.data) execution.generatedOutput = event.data.output;
            event.type = "execution_ended";
            internalEventListener(event);
        }
        
        if (readyToStart) {
            event.type = "ready_to_start";
            internalEventListener(event);
        }
        
        if (resultReady) {
            event.type = "result_ready";
            internalEventListener(event);
        }
    }
    
    function executionEventListener(execution, event) {
        switch(event.type) {
          case "execution_initialized":
          case "input_uploaded": {
            execution.uploadNextInput();
          } break;
          
          case "ready_to_start": {
            execution.start();
          } break;
          
          case "execution_started": {
            execution.scheduleGetInfo();
          } break;
          
          case "execution_info": {
            if (event.data.status == "running") {
                execution.scheduleGetInfo();
            }
          } break;
          
          case "output_retrieved": {
            execution.downloadNextOutput();
          } break;
          
          case "result_ready": {
            if (execution.generatedOutput.length == 1) {
                if ("json" in execution.generatedOutput[0]) {
                    execution.result = execution.generatedOutput[0].json;
                } else {
                    execution.result = execution.output;
                }
            } else {
                execution.result = execution.output;
            }
            
            execution.terminate();
          } break;
          
          case "execution_ended": {
            execution.downloadNextOutput();
          } break;
          
          case "error": {
            execution.error = {operation: event.operation, info: event.data.errorMessage};
          } break;
        
          default: break;
        }
    }
            
    function handleResponse(operation, request, response, subject, outputId) {
        if (!("attempts" in request)) {
            request.attempts = 1;
            request.maxAttempts = 6;
            request.nextAttempt = null;
        }
        
        let execution = null;
        let func = null;
        
        if (operation != "function_initialization" && operation != "new_key") {
            execution = subject;
            func = execution.func;
        } else {
            func = subject;
        }
        
        let successEventType = OperationSuccessEventType[operation];
        let objectType = getObjectType(operation);
        
        if (response.ok) {
            if (operation != "output_retrieval") {
                response.json().then((data)=>internalEventListener({operation, type: successEventType, response, data, execution, func, objectType}));
            } else {
                let output = execution.getGeneratedOutput(outputId);
                
                response.blob().then(function(blob) {
                    output.blob = blob;
                    if (output.path.endsWith(".json") || output.path.endsWith(".csv") || output.path.endsWith(".txt")) {
                        output.blob.text().then(function(txt) {
                            output.text = txt;
                            if (output.path.endsWith(".json")) {
                                output.json = JSON.parse(txt);
                            }
                            internalEventListener({operation, type: successEventType, response, data: output, execution, func, objectType});
                        });
                    } else {
                        internalEventListener({operation, type: successEventType, response, data: output, execution, func, objectType});
                    }
                });
            }
        } else {
            if (response.status == 503) {
                // 503: Opt-server is currently offline. Retry.
                if (request.attempts < request.maxAttempts) {
                    request.nextAttempt = setTimeout(function() {
                        fetch(request).then((response) => handleResponse(operation, request, response, subject, outputId));
                        ++request.attempts;
                    }, 1000*3);
                } else {
                    response.json().then((data) => internalEventListener({operation, type: "error", data, response, execution, func, objectType}));
                }
            } else {
                let contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    response.json().then((data) => internalEventListener({operation, type: "error", data, response, execution, func, objectType}));
                } else {
                    internalEventListener({operation, type: "error", data: null, response, execution, func, objectType});
                }
            }
        }
    }
    
    function createExecution(func) {
        return {
            initialized: false,
            endpoint: undefined,
            eventListeners: [],
            metadata: {},
            input: undefined,
            providedInput: [],
            nextInputToUpload: 0,
            nextOutputToDownload: 0,
            nextInfoRetrieval: null,
            generatedOutput: [],
            output: {},
            result: undefined,
            stopped: false,
            func: func,
            apiKey: func.apiKey,
            getHTTPHeaders: function() {return {Authorization: `Bearer ${this.apiKey}`}},
            setMetadata: function(key, value) {
                this.metadata[key] = value;
                return this;
            },
            interrupt: function() {
                this.stopped = true;
                
                if (this.nextInfoRetrieval != null) {
                    clearTimeout(this.nextInfoRetrieval);
                    this.nextInfoRetrieval = null;
                }
            },
            uploadNextInput: function() {
                if (this.nextInputToUpload < this.providedInput.length) {
                    let input = this.providedInput[this.nextInputToUpload++];
                    this.uploadInput(input.id, input.content);
                    return true;
                } else {
                    return false;
                }
            },
            downloadNextOutput: function() {
                if (this.generatedOutput && this.nextOutputToDownload < this.generatedOutput.length) {
                    let output = this.generatedOutput[this.nextOutputToDownload++];
                    this.downloadOutput(output.id);
                    return true;
                } else {
                    return false;
                }
            },
            initialize: function() {
                // POST func.pifop.com/:func_author/:func_id
                let request = new Request(`${this.func.endpoint}/executions`, {method: "POST", headers: this.getHTTPHeaders()});
                fetch(request).then((response) => handleResponse("execution_initialization", request, response, this));
                return this;
            },
            uploadInput: function(inputId, inputContent) {
                if (!this.func.config.input.length) {
                    internalEventListener({operation: "input_upload", type: "error", response: new Response("", {status: 400}), data: {errorMessage: "This function does not accepts any inputs."}, execution: this, func: this.func, objectType: "execution"});
                    return this;
                } else if (inputId == "") {
                    if (this.func.config.input.length >= 2) {
                        internalEventListener({operation: "input_upload", type: "error", response: new Response("", {status: 400}), data: {errorMessage: "Unidentified input files can only be provided when the function being called expects a single input file, but the function you are calling accepts multiple input files. Use `setInput(id, content)` to specify the id of the file that you want to upload."}, execution: this, func: this.func, objectType: "execution"});
                        return this;
                    } else {
                        inputId = this.func.config.input[0].id;
                    }
                }
                
                // POST func.pifop.com/:func_author/:func_id/executions/:exec_id/input/:input_id
                let request = new Request(`${this.endpoint}/input/${inputId}`, {method: "POST", headers: this.getHTTPHeaders(), body: inputContent});
                fetch(request).then((response) => handleResponse("input_upload", request, response, this));
            },
            downloadOutput: function(outputId) {
                // GET func.pifop.com/:func_author/:func_id/executions/:exec_id/output/:output_id
                let request = new Request(`${this.endpoint}/output/${outputId}`, {headers: this.getHTTPHeaders()});
                fetch(request).then((response) => handleResponse("output_retrieval", request, response, this, outputId));
            },
            start: function() {
                // POST func.pifop.com/:func_author/:func_id/executions/:exec_id/start
                let request = new Request(`${this.endpoint}/start`, {method: "POST", headers: this.getHTTPHeaders()});
                fetch(request).then((response) => handleResponse("execution_start", request, response, this));
            },
            stop: function() {
                this.interrupt();
                if (!this.initialized) return;
                
                // POST func.pifop.com/:func_author/:func_id/executions/:exec_id/stop
                let request = new Request(`${this.endpoint}/stop`, {method: "POST", headers: this.getHTTPHeaders()});
                fetch(request).then((response) => handleResponse("execution_stop", request, response, this));
            },
            terminate: function() {
                this.interrupt();
                if (!this.initialized) return;
                
                // DELETE func.pifop.com/:func_author/:func_id/executions/:exec_id
                let request = new Request(`${this.endpoint}`, {method: "DELETE", headers: this.getHTTPHeaders()});
                fetch(request).then((response) => handleResponse("execution_termination", request, response, this));
            },
            getInfo: function() {
                // GET func.pifop.com/:func_author/:func_id/executions/:exec_id?stdout=...
                let request = new Request(`${this.endpoint}?stdout=true`, {headers: this.getHTTPHeaders()});
                fetch(request).then((response) => handleResponse("execution_info_retrieval", request, response, this));
            },
            scheduleGetInfo: function() {
                let execution = this;
                execution.nextInfoRetrieval = setTimeout(() => {execution.getInfo()}, 1000*1);
            },
            getGeneratedOutput: function(id) {
                let result = null;
                for (let output of this.generatedOutput) {
                    if (output.id == id) {
                        result = output;
                        break;
                    }
                }
                return result;
            },
            setInput: function(id, content) {
                if (!this.input) this.input = {};
                
                let overwrite = (id in this.input);
                this.input[id] = content;
                
                if (overwrite) {
                    for (let input of this.providedInput) {
                        if (input.id == id) {
                            input.content = content;
                            break;
                        }
                    }
                } else {
                    this.providedInput.push({id, content});
                }
                
                return this;
            },
            withInput: function(content) {
                this.setInput("", content);
                return this;
            },
            addEventListener: function(type, listener) {
                this.eventListeners.push({type, listener});
                return this;
            },
            removeEventListener: function(type, listener) {
                for (i in this.eventListeners) {
                    let entry = this.eventListeners.listener[i];
                    if (entry.type == type && entry.listener == listener) {
                        this.eventListeners.splice(i, 1);
                        break;
                    }
                }
                return this;
            },
            onEvent: function(listener) {
                this.addEventListener("any", listener);
                return this;
            },
            onProgress: function(listener) {
                this.addEventListener("execution_info", listener);
                return this;
            },
            onFinish: function(listener) {
                this.addEventListener("execution_terminated", listener);
                return this;
            },
            onError: function(listener) {
                this.addEventListener("error", listener);
                return this;
            },
            onInit: function(listener) {
                this.addEventListener("execution_initialized", listener);
                return this;
            }
        };
    }
    
    function initFunction(funcUID, apiKey, masterKey) {
        let funcAuthor = getFuncAuthorFromUID(funcUID);
        let funcId = getFuncIdFromUID(funcUID);
        
        let result = {
            initialized: false,
            author: funcAuthor,
            id: funcId,
            getHTTPHeaders: function() {return {Authorization: `Bearer ${this.apiKey}`}},
            apiKey: apiKey,
            masterKey: masterKey,
            metadata: {},
            eventListeners: [],
            executions: [],
            endpoint: `https://${pifopEndpoint}/${funcAuthor}/${funcId}`,
            genAPIKey: function(name, limits) {
                if (limits == undefined) limits = {};
                
                let extraParams = "";
                if ("max_memory" in limits) extraParams += `&max_memory=${limits.max_memory}`;
                if ("max_time" in limits) extraParams += `&max_time=${limits.max_time}`;
                if ("max_parallel_jobs" in limits) extraParams += `&max_parallel_jobs=${limits.max_parallel_jobs}`;
                
                // POST func.pifop.com/:func_author/:func_id/api_keys?name=:key_name&max_memory=10
                let request = new Request(`${this.endpoint}/api_keys?name=${name}${extraParams}`, {method: "POST", headers: {Authorization: `Bearer ${this.masterKey}`}});
                fetch(request).then((response) => handleResponse("new_key", request, response, this));
            },
            deleteAPIKey: function(name) {
                // DELETE func.pifop.com/:func_author/:func_id/api_keys/:key_name
                let request = new Request(`${this.endpoint}/api_keys/${name}`, {method: "DELETE", headers: {Authorization: `Bearer ${this.masterKey}`}});
                fetch(request).then((response) => handleResponse("delete_key", request, response, this));
            },
            initExecution: function() {
                let execution = createExecution(this);
                
                if (this.initialized) {
                    execution.initialize();
                } else {
                    this.onInit(()=>execution.initialize());
                }
                
                this.executions.push(execution);
                
                return execution;
            },
            addEventListener: function(type, listener) {
                this.eventListeners.push({type, listener});
                return this;
            },
            removeEventListener: function(listener) {
                for (i in this.eventListeners) {
                    let entry = this.eventListeners.listener[i];
                    if (entry.type == type && entry.listener == listener) {
                        this.eventListeners.splice(i, 1);
                        break;
                    }
                }
                return this;
            },
            onEvent: function(listener) {
                this.addEventListener("any", listener);
                return this;
            },
            onInit: function(listener) {
                this.addEventListener("function_initialized", listener);
                return this;
            },
            onError: function(listener) {
                this.addEventListener("error", listener);
                return this;
            }
        };
        
        // GET func.pifop.com/:func_author/:func_id
        let request = new Request(`${result.endpoint}`, {headers: result.getHTTPHeaders()});
        fetch(request).then((response) => handleResponse("function_initialization", request, response, result));
        
        return result;
    }
    
    function executeFunction(funcUID, apiKey, input) {
        let execution = initFunction(funcUID, apiKey)
                          .initExecution()
                          .onEvent(executionEventListener);
        
        if (typeof input != "undefined") {
            execution.withInput(input);
        }
        
        return execution;
    }
    
    function getFuncIdFromUID(uid) {
        let array = uid.split("/");
        if (array.length == 2) {
            return array[1];
        }
        return array[0];
    }
    
    function getFuncAuthorFromUID(uid) {
        let array = uid.split("/");
        if (array.length == 2) {
            return array[0];
        }
        return undefined;
    }
    
    return {
        initFunction: initFunction,
        execute: executeFunction,
        setPIFOPEndpoint // for development only
    };
}

if (RUNTIME_ENVIRONMENT == "browser") {
    var pifop = (typeof pifop == "undefined") ? PIFOPModule() : pifop;
} else if (RUNTIME_ENVIRONMENT == "node") {
    module.exports = PIFOPModule();
}

