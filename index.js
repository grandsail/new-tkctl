#!/usr/bin/env node
var name = process.argv[2];
var shell = require("shelljs");
var yaml = require("js-yaml");
var fs = require("fs");

const TKCTL_VERSION = "v0.1.0"

const GET_PODS_COLUMNS = 6;
const GET_PODS_COLUMNS_WITH_NS = 5;
const GET_PODS_COLUMNS_WIDE = 10;
const GET_PODS_COLUMNS_WIDE_WITH_NS = 9;
const ALL_TIDB_COMPONENT = ["pd", "tidb", "tikv"]

const CONTEXT = {
    "TidbCluster": "default",
    "NameSpace": "default"
}
const TC_IN_USE = "";
const NS_IN_USE = "";

var argv = require('yargs')
    .command("version", "Show the version of tkctl and tidb-operator", function (yargs) {
        var tidb_controller_manager_raw_info = shell.exec("kubectl get pods -A -o json", { silent: true });
        var pods_list = JSON.parse(tidb_controller_manager_raw_info.stdout).items;
        var tidb_controller_manager_image = "";
        var tidb_scheduler_image = "";
        for (var key in pods_list) {
            var pod = pods_list[key];
            var pod_containers = pod.spec.containers;
            for (var i in pod_containers) {
                var container = pod_containers[i];
                var image_name = container.image;
                if (image_name.indexOf("pingcap/tidb-operator") >= 0) {
                    if (pod.spec.serviceAccountName == "tidb-controller-manager") {
                        tidb_controller_manager_image = image_name;
                    }
                    if (pod.spec.serviceAccountName == "tidb-scheduler") {
                        tidb_scheduler_image = image_name;
                    }
                }
            }
        }
        if (tidb_controller_manager_image == "" | tidb_scheduler_image == "") {
            console.log("TiDB Operator is not ready");
            process.exit(0);
        }

        console.log("Welcome to tkctl " + TKCTL_VERSION);
        console.log("TiDB Controller Manager Version: " + tidb_controller_manager_image);
        console.log("TiDB Scheduler Version: " + tidb_scheduler_image);
        process.exit(0)
    })
    .command("use", "Set the TiDB cluster or Namespace to use.", function (yargs) {
        var argv = yargs.reset()
            .option("n", {
                alias: "namespace",
                description: "Identify the Kubenetes Namespace to use."
            })
            .option("t", {
                alias: "tidbcluster",
                description: "Identify the TiDB cluster to use."
            })
            .help("h")
            .alias("h", "help")
            .argv;

        var context = CONTEXT;
        fs.access(__dirname + 'new_tkctl_context.json', fs.constants.F_OK | fs.constants.W_OK, (err) => {
            if (err) {
                var raw_context = JSON.stringify(CONTEXT);
                fs.writeFileSync(__dirname + '/new_tkctl_context.json', raw_context);
                return 0;
            }
            else {
                var raw_context = fs.readFileSync(__dirname + 'new_tkctl_context.json');
                context = JSON.parse(raw_context);
            }
        })
        if ("tidbcluster" in argv) {
            context.TidbCluster = argv.t;
            console.log("Set tidbcluster to: " + context.TidbCluster);
        }
        if ("namespace" in argv) {
            context.NameSpace = argv.n;
            console.log("Set namespace to: " + context.NameSpace);
        }
        console.log("New context: [ NameSpace: " + context.NameSpace + " ], [ TidbCluster: " + context.TidbCluster + " ].");
        var raw_context = JSON.stringify(context);
        fs.writeFileSync(__dirname + '/new_tkctl_context.json', raw_context);
        process.exit(0)
    })
    .command("reset", "Reset the TiDB cluster and Namespace context settings.", function (yargs) {
        var old_context = CONTEXT;
        fs.access(__dirname + 'new_tkctl_context.json', fs.constants.F_OK | fs.constants.W_OK, (err) => {
            if (err) {
                var raw_context = JSON.stringify(CONTEXT);
                fs.writeFileSync(__dirname + '/new_tkctl_context.json', raw_context);
                return 0;
            }
            else {
                var raw_context = fs.readFileSync(__dirname + 'new_tkctl_context.json');
                old_context = JSON.parse(raw_context);
            }
        })
        old_namespace = old_context.NameSpace;
        old_tidbcluster = old_context.TidbCluster;

        var raw_context = JSON.stringify(CONTEXT);
        fs.writeFileSync(__dirname + '/new_tkctl_context.json', raw_context);
        console.log("Context reset: [ NameSpace: " + old_namespace + " -> " + CONTEXT.NameSpace + " ], [ TidbCluster: " + old_tidbcluster + " -> " + CONTEXT.TidbCluster + " ].");
        process.exit(0)
    })
    .command("list", "Show tidb clusters in named namespaces.", function (yargs) {
        var argv = yargs.reset()
            .option("A", {
                alias: "all-namespaces",
                description: "Show TiDB clusters in all Kubenetes namespaces."
            })
            .option("n", {
                alias: "namespace",
                description: "Show TiDB clusters in the identified Kubenetes namespace."
            })
            .help("h")
            .alias("h", "help")
            .argv;

        if ("all-namespaces" in argv) {
            shell.exec("kubectl get tc -A");
            process.exit(0);
        }
        else if ("namespace" in argv) {
            shell.exec("kubectl get tc -n " + argv.namespace);
            process.exit(0);
        }
        else {
            var context = CONTEXT;
            fs.access(__dirname + 'new_tkctl_context.json', fs.constants.F_OK | fs.constants.W_OK, (err) => {
                if (err) {
                    var raw_context = JSON.stringify(CONTEXT);
                    fs.writeFileSync(__dirname + '/new_tkctl_context.json', raw_context);
                    return 0;
                }
                else {
                    var raw_context = fs.readFileSync(__dirname + 'new_tkctl_context.json');
                    context = JSON.parse(raw_context);
                }
            })
            console.log("Using context: [ Namespace = " + context.NameSpace + " ]")
            shell.exec("kubectl get tc -n " + context.NameSpace);
            process.exit(0);
        }
    })
    .command("info", "Show detailed information of a tidb cluster.", function (yargs) {
        var argv = yargs.reset()
            .option("n", {
                alias: "namespace",
                description: "Identify the namespace to use."
            })
            .option("t", {
                alias: "tidbcluster",
                description: "Identify the tidb cluster to use."
            })
            .help("h")
            .alias("h", "help")
            .argv;

        var tidb_info = {};
        if ("tidbcluster" in argv && "namespace" in argv) {
            var tidb_raw_info = shell.exec("kubectl get tc -o json -n " + argv.namespace + " " + argv.tidbcluster, { silent: true });
            tidb_info = JSON.parse(tidb_raw_info.stdout);
        }
        else {
            var context = CONTEXT;
            fs.access(__dirname + 'new_tkctl_context.json', fs.constants.F_OK | fs.constants.W_OK, (err) => {
                if (err) {
                    var raw_context = JSON.stringify(CONTEXT);
                    fs.writeFileSync(__dirname + '/new_tkctl_context.json', raw_context);
                    return 0;
                }
                else {
                    var raw_context = fs.readFileSync(__dirname + 'new_tkctl_context.json');
                    context = JSON.parse(raw_context);
                }
            })
            if ("namespace" in argv) {
                context.NameSpace = argv.namespace;
            }
            if ("tidbcluster" in argv) {
                context.TidbCluster = argv.tidbcluster;
            }
            var tidb_raw_info = shell.exec("kubectl get tc -o json -n " + context.NameSpace + "  " + context.TidbCluster, { silent: true }).stdout;
            tidb_info = JSON.parse(tidb_raw_info.stdout);
        }

        const TITLE_PAD = 25;
        const ITEM_PAD = 10;
        var tidb_metadata = tidb_info.metadata;
        console.log("Name:".padEnd(TITLE_PAD) + tidb_metadata.name);
        console.log("namepsace:".padEnd(TITLE_PAD) + tidb_metadata.namespace);
        console.log("CreationTimestamp:".padEnd(TITLE_PAD) + tidb_metadata.creationTimestamp);

        console.log("Overview:")
        console.log('\t' + 'Phase'.padEnd(ITEM_PAD) + 'Ready'.padEnd(ITEM_PAD) + 'Desired'.padEnd(ITEM_PAD) + 'CPU'.padEnd(ITEM_PAD) + 'Memory'.padEnd(ITEM_PAD) + 'Storage'.padEnd(ITEM_PAD) + 'Version'.padEnd(ITEM_PAD))
        console.log('\t' + '-----'.padEnd(ITEM_PAD) + '-----'.padEnd(ITEM_PAD) + '-------'.padEnd(ITEM_PAD) + '---'.padEnd(ITEM_PAD) + '------'.padEnd(ITEM_PAD) + '-------'.padEnd(ITEM_PAD) + '-------'.padEnd(ITEM_PAD))

        var spec_pd = tidb_info.spec.pd
        var status_pd = tidb_info.status.pd
        var pd_info = ""
        pd_info += "  PD:".padEnd(ITEM_PAD - 2) + status_pd.phase.padEnd(ITEM_PAD) + status_pd.statefulSet.readyReplicas.toString().padEnd(ITEM_PAD) + status_pd.statefulSet.replicas.toString().padEnd(ITEM_PAD)
        pd_info += spec_pd.requests.cpu.padEnd(ITEM_PAD) + spec_pd.requests.memory.padEnd(ITEM_PAD) + spec_pd.requests.storage.padEnd(ITEM_PAD)
        pd_info += status_pd.image
        console.log(pd_info)

        var spec_tikv = tidb_info.spec.tikv
        var status_tikv = tidb_info.status.tikv
        var tikv_info = ""
        tikv_info += "  TiKV:".padEnd(ITEM_PAD - 2) + status_tikv.phase.padEnd(ITEM_PAD) + status_tikv.statefulSet.readyReplicas.toString().padEnd(ITEM_PAD) + status_tikv.statefulSet.replicas.toString().padEnd(ITEM_PAD)
        tikv_info += spec_tikv.requests.cpu.padEnd(ITEM_PAD) + spec_tikv.requests.memory.padEnd(ITEM_PAD) + spec_tikv.requests.storage.padEnd(ITEM_PAD)
        tikv_info += status_tikv.image
        console.log(tikv_info)

        var spec_tidb = tidb_info.spec.tidb
        var status_tidb = tidb_info.status.tidb
        var tidb_info = ""
        tidb_info += "  TiDB:".padEnd(ITEM_PAD - 2) + status_tidb.phase.padEnd(ITEM_PAD) + status_tidb.statefulSet.readyReplicas.toString().padEnd(ITEM_PAD) + status_tidb.statefulSet.replicas.toString().padEnd(ITEM_PAD)
        tidb_info += spec_tidb.requests.cpu.padEnd(ITEM_PAD) + spec_tidb.requests.memory.padEnd(ITEM_PAD) + spec_tidb.requests.storage.padEnd(ITEM_PAD)
        tidb_info += status_tidb.image
        console.log(tidb_info)

        console.log("TiDB Service:".padEnd(TITLE_PAD) + spec_tidb.service.type)
    })
    .command("get", "Get the information about [component].", function (yargs) {
        var argv = yargs.reset()
            .command("tidb", "Get the information about tidb component", function (yargs) {
            })
            .command("tikv", "Get the information about tikv component", function (yargs) {
            })
            .command("pd", "Get the information about pd component", function (yargs) {
            })
            .option("n", {
                alias: "namespace",
                description: "Identify the namespace to use."
            })
            .option("t", {
                alias: "tidbcluster",
                description: "Identify the tidb cluster to use."
            })
            .option("R", {
                alias: "resource",
                description: "Get the resource usage information."
            })
            .help("h")
            .alias("h", "help")
            .argv

        const basic_fields = ["NAME", "READY", "STATUS", "RESTARTS", "AGE", "NODE"]
        const resource_additional_fields = ["CPU", "MEMORY"]
        const TOP_OUTPUT_COLUMNS = 4

        var context = {};
        if ("tidbcluster" in argv && "namespace" in argv) {
            context.NameSpace = argv.namespace;
            context.TidbCluster = argv.tidbcluster;
        }
        else {
            var context = CONTEXT;
            fs.access(__dirname + 'new_tkctl_context.json', fs.constants.F_OK | fs.constants.W_OK, (err) => {
                if (err) {
                    var raw_context = JSON.stringify(CONTEXT);
                    fs.writeFileSync(__dirname + '/new_tkctl_context.json', raw_context);
                    return 0;
                }
                else {
                    var raw_context = fs.readFileSync(__dirname + 'new_tkctl_context.json');
                    context = JSON.parse(raw_context);
                }
            })
            if ("namespace" in argv) {
                context.NameSpace = argv.namespace;
            }
            if ("tidbcluster" in argv) {
                context.TidbCluster = argv.tidbcluster;
            }
            console.log("Using context: [ Namespace = " + context.NameSpace + " ], [ TidbCluster = " + context.TidbCluster + " ].")
        }

        var pods_raw_info = shell.exec("kubectl get pods -o json -n " + context.NameSpace, { silent: true });
        pods_info = JSON.parse(pods_raw_info.stdout).items;
        var component_to_search = [];
        if (argv._.includes("all")) {
            component_to_search = ALL_TIDB_COMPONENT;
        }
        else {
            for (var key in ALL_TIDB_COMPONENT) {
                if (argv._.includes(ALL_TIDB_COMPONENT[key])) {
                    component_to_search.push(ALL_TIDB_COMPONENT[key]);
                }
            }
        }

        var component_resource_list = []
        if ("resource" in argv) {
            var component_resource_list_raw = shell.exec("kubectl top pods -n " + context.TidbCluster + " | sed 's/[ ][ ]*/ /g'", { silent: true });
            var component_resource_array = component_resource_list_raw.stdout.split(/[\s\n]/);
            component_resource_array.splice(component_resource_array.length - 1, 1);
            var array_length = component_resource_array.length;
            if (array_length > TOP_OUTPUT_COLUMNS) {
                for (var index = TOP_OUTPUT_COLUMNS; index < array_length; index++) {
                    var resource = {};
                    resource.name = component_resource_array[index];
                    resource.cpu = component_resource_array[index + 1];
                    resource.memory = component_resource_array[index + 2];
                    component_resource_list.push(resource);
                }
            }
        }

        var component_info_list = []
        for (var key in pods_info) {
            for (var i in component_to_search) {
                var component_info = {}
                pod = pods_info[key];
                if (context.TidbCluster + '-' + component_to_search[i] + '-' != pod.metadata.generateName) {
                    continue;
                }

                component_info.name = pod.metadata.name;

                var container_list = pod.status.containerStatuses;
                var container_count = container_list.length;
                var container_running_count = 0;
                var restart_count = 0;
                for (container_index in container_list) {
                    if ("running" in container_list[container_index].state) {
                        container_running_count += 1;
                    }
                    if (container_list[container_index].restartCount > restart_count) {
                        restart_count = container_list[container_index].restartCount;
                    }
                }
                component_info.ready = container_running_count.toString() + '/' + container_running_count.toString();
                component_info.restarts = restart_count.toString();

                component_info.status = pod.status.phase;

                var age_time = Date.now() - Date.parse(pod.status.startTime);
                var age_second = parseInt(age_time / 1000);
                var age_minutes = parseInt(age_second / 60);
                var age_hours = parseInt(age_minutes / 60);
                var age_days = parseInt(age_hours / 24)
                if (age_days > 0) {
                    component_info.age = age_days.toString() + 'd' + (age_hours % 24).toString() + 'h';
                }
                else if (age_hours > 0) {
                    component_info.age = age_hours.toString() + 'h' + (age_minutes % 60).toString() + 'm';
                }
                else if (age_minutes > 0) {
                    component_info.age = age_minutes.toString() + 'm' + (age_second % 60).toString() + 's';
                }
                else {
                    component_info.age = age_second.toString() + 's';
                }

                component_info.node = pod.status.hostIP + '/' + pod.spec.nodeName;

                if ("resource" in argv) {
                    var component_name = component_to_search[i];
                    var pod_name = component_info.name;
                    var spec_list = pod.spec.containers;
                    var request_cpu = ""
                    var request_memory = ""
                    for (var spec_index in spec_list) {
                        var container = spec_list[spec_index];
                        if (component_name != container.name) {
                            continue;
                        }
                        else {
                            request_cpu = container.resources.requests.cpu;
                            request_memory = container.resources.requests.memory;
                        }
                    }
                    var resource_cpu = ""
                    var resource_memory = ""
                    for (var resource_index in component_resource_list) {
                        if (component_resource_list[resource_index].name != pod_name) {
                            continue;
                        }
                        else {
                            resource_cpu = component_resource_list[resource_index].cpu;
                            resource_memory = component_resource_list[resource_index].memory;
                        }
                    }
                    component_info.cpu = resource_cpu + '/' + request_cpu;
                    component_info.memory = resource_memory + '/' + request_memory;
                }

                component_info_list.push(component_info);
            }
        }

        var pod_name_pad = context.TidbCluster.length + 15;
        var item_pad = 12
        if ("resource" in argv) {
            console.log('NAME'.padEnd(pod_name_pad) + 'READY'.padEnd(item_pad) + 'STATUS'.padEnd(item_pad) + 'MEMORY'.padEnd(item_pad) + 'CPU'.padEnd(item_pad) + 'RESRARTS'.padEnd(item_pad) + 'AGE'.padEnd(item_pad) + 'NODE'.padEnd(item_pad))
            for (var item_index in component_info_list) {
                var item_string = component_info_list[item_index].name.padEnd(pod_name_pad) + component_info_list[item_index].ready.padEnd(item_pad) + component_info_list[item_index].status.padEnd(item_pad)
                item_string += component_info_list[item_index].memory.padEnd(item_pad) + component_info_list[item_index].cpu.padEnd(item_pad)
                item_string += component_info_list[item_index].restarts.padEnd(item_pad) + component_info_list[item_index].age.padEnd(item_pad)
                item_string += component_info_list[item_index].node.padEnd(item_pad)
                console.log(item_string)
            }
        }
        else {
            console.log('NAME'.padEnd(pod_name_pad) + 'READY'.padEnd(item_pad) + 'STATUS'.padEnd(item_pad) + 'RESRARTS'.padEnd(item_pad) + 'AGE'.padEnd(item_pad) + 'NODE'.padEnd(item_pad))
            for (var item_index in component_info_list) {
                var item_string = component_info_list[item_index].name.padEnd(pod_name_pad) + component_info_list[item_index].ready.padEnd(item_pad) + component_info_list[item_index].status.padEnd(item_pad)
                item_string += component_info_list[item_index].restarts.padEnd(item_pad) + component_info_list[item_index].age.padEnd(item_pad)
                item_string += component_info_list[item_index].node.padEnd(item_pad)
                console.log(item_string)
            }
        }
    })
    .command("lpv", "View the tree structure of local pv in the cluster", function (yargs) {
        var local_pv_raw_info = shell.exec("kubectl get pv -A -o json", { silent: true });
        var lpv_list = JSON.parse(local_pv_raw_info.stdout).items;

        var local_pv_tree = {};
        for (var lpv_index in lpv_list) {
            var current_pv = lpv_list[lpv_index]
            var pv_owner = current_pv.metadata.ownerReferences[0].name;
            if (!(pv_owner in local_pv_tree)) {
                local_pv_tree[pv_owner] = []
            }
            pv_formatted = {}
            pv_formatted.name = current_pv.metadata.name;
            pv_formatted.storageClass = current_pv.spec.storageClassName;
            pv_formatted.capacity = current_pv.spec.capacity.storage;
            pv_formatted.path = current_pv.spec.local.path;
            pv_formatted.status = current_pv.status.phase;
            if (pv_formatted.status == "Bound") {
                pv_formatted.pvcNamespace = current_pv.spec.claimRef.namespace;
                pv_formatted.pvcName = current_pv.spec.claimRef.name;
            }
            local_pv_tree[pv_owner].push(pv_formatted);
        }

        var nodes_list = Object.keys(local_pv_tree).sort();
        for (var node_index in nodes_list) {
            var owner_name = nodes_list[node_index];
            var current_pv_list = local_pv_tree[owner_name];
            console.log(owner_name);
            for (var pv_index in current_pv_list) {
                var current_pv = current_pv_list[pv_index];
                var pv_line = "  | -> " + current_pv.name + "(" + current_pv.storageClass + ")".padEnd(6) + current_pv.capacity.padEnd(8) + current_pv.path;
                var pvc_line = "  | -> "
                if (current_pv.status == "Bound") {
                    pvc_line = pvc_line + "Bound:".padEnd(8) + current_pv.pvcNamespace + "/" + current_pv.pvcName;
                }
                else {
                    pvc_line += current_pv.status;
                }
                console.log("  ---");
                console.log(pv_line);
                console.log(pvc_line);
            }
        }

        process.exit(0)
    })
    .usage('Usage: tkctl [options]')
    .example('tkctl --version')
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2020')
    .argv;
