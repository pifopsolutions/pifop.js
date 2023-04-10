# PIFOP Functions JavaScript API Documentation

> **Warning**:
> This is a work in progress and should not be relied on. See the [initial page](https://github.com/pifopsolutions/pifop.js) for more reliable and up-to-date information.

## Overview

This library defines two types of objects:
- `Function`: represent a PIFOP function. Create a `Function` object with `pifop.initFunction(...)`:
```js
let func = pifop.initFunction("joe/example", "apikey_ABC123");
```
- `Execution`: represent a function execution. Create an `Execution` object with `pifop.execute(...)`:
```js
let execution = pifop.execute("joe/example", "apikey_ABC123");
```

Although every `Execution` depends on a `Function`, most of the time you will not be interacting with `Function` objects directly.

## `Execution` API

#### `initialize()`
Sends request to initialize execution.
Equivalent HTTP request: `POST func.pifop.com/:func_author/:func_id`

---

#### `uploadInput(inputId, content)`
Upload input `inputId`.
Equivalent HTTP request: `POST func.pifop.com/:func_author/:func_id/executions/:exec_id/input/:input_id`

---

#### `start()`
Sends request to start the execution.
Equivalent HTTP request: `POST func.pifop.com/:func_author/:func_id/executions/:exec_id/start`

---

#### `getInfo()`
Sends request to retrieve execution information, optionally including the terminal output.
Equivalent HTTP request: `GET func.pifop.com/:func_author/:func_id/executions/:exec_id?stdout=...`

---

#### `downloadOutput(outputId)`
Downloads output `outputId`.
Equivalent HTTP request: `GET func.pifop.com/:func_author/:func_id/executions/:exec_id/output/:output_id`

---

#### `stop()`
Sends request to stop the execution.
Equivalent HTTP request: `POST func.pifop.com/:func_author/:func_id/executions/:exec_id/stop`

---

#### `terminate()`
Sends request to terminate the execution.
Equivalent HTTP request: `DELETE func.pifop.com/:func_author/:func_id/executions/:exec_id`

---

#### `addEventListener(type, listener)`
General event listener setter.
