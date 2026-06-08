const data = JSON.stringify({city: "上海", cycle: "2023-11", basePath: "/", sourcePath: "/", action: "summary_parttime"});
fetch("http://127.0.0.1:8000/api/run", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: data
}).then(res => res.text()).then(console.log).catch(console.error);
