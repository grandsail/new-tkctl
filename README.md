# new-tkctl-nodejs

### How to use

1.  `git clone` to a path 
2.  use `npm install --save` in the path with `package.json`
3.  use the program directly with `./index.js` (replace all `tkctl` commands with `./index.js`) 
4.  or use `npm link` in the path, and use the program with `tkctl`
PS: you can refer to [how to install Node.js and npm on CentOS7](https://linuxize.com/post/how-to-install-node-js-on-centos-7/) to ensure the program's normal operation. 

### Introduction

This `tkctl` tool is realized with Node.js, which is a refactoration of the old and deprecated `tkctl` tool.

#### Realized functions

| **Flag**            | **Description**                              |
| --------------- | --------------------------------- |
| version         | View the version of `tkctl` and `tidb-operator` |
| use             | Set the `TiDB` cluster context to use        |
| reset           | Reset the `TiDB` cluster context to default |
| clean           | Clean the json file to store `TiDB` cluster context |
| list            | List all `TiDB` clusters installed in `Kubernetes` cluster |
| info            | List the overall information of a `TiDB` cluster |
| get [component] | Get more detailed information of `TiDB` components |
| lpv        | View the tree structure of `local pv` in the cluster |

#### New functions

| **Flag** | **Description** |
| ---- | ---- |
| /    | /    |

#### Unrealized functions

| **Flag**             | **Description**                    | **Reason**         |
| ---------------- | --------------------------- | ------------------ |
| debug [pod_name] | Debug `Pod` in `TiDB` clusters      |  temporary unrealized |
| options          | View the global flags of `tkctl`  | use `-h` or `--help` directly |
| help [command]   | Print help messages of the sub commands      | use `-h` or `--help` directly |
| ctop             | View the real-time monitoring stats of the target `Pod` or `node` in the cluster | temporary unrealized

### tkctl version

View the version of `tkctl` and `tidb-operator` in the cluster.

```
$ tkctl version 
Welcome to tkctl {$tkctl_version}.
TiDB Controller Manager Version: pingcap/tidb-operator:v1.1.6
TiDB Scheduler Version: pingcap/tidb-operator:v1.1.6
```

### tkctl use

Set the context flags used in following commands. For example, `tkctl info` will use the context `namespace` and `tidbcluster` if there is no corresponding flag(s) used in the `info` command (the output will list the context used). 

| **FLag**          | **Abbreviation** | **Description**                   |
| ------------- | ---- | ---------------------- |
| --namespace   | -n   | Specify the `namespace` to use |
| --tidbcluster | -t   | Specify the `TiDB` cluster to use |

```
bash
$ tkctl use -n foo -t demo_cluster
Context set: [ NameSpace = foo ], [ TidbCluster = demo_cluster ].
```

For now, this program store the context parameters with a file. Test result indicates that R&W operations consume 1~3 ms. And considering the delay of communications between servers, all `kubectl` commands consumes 100~200 ms. The solution using files is acceptable for now.

### tkctl reset 

Reset the `TiDB` cluster context to default.

```
$ tkctl reset
Context reset: [ NameSpace = default ], [ TidbCluster = default ].
```

### tkctl clean 

Clean the json file to store `TiDB` cluster context.

```
$ tkctl clean
Context json file cleaned.
```

### tkctl list

list all `TiDB` clusters installed in the `Kubernetes` cluster.

| **Flag**             | **Abreviation** | **Description**                                |
| ---------------- | ---- | ----------------------------------- |
| --all-namespaces | -A   | Use all `namespace` in `Kubernetes` cluster|
| --namespace      | -n   | Specify a `namespace`                       |

```
$ tkctl list -A 
NAMESPACE        NAME             READY   PD                  STORAGE   READY   DESIRE   TIKV                  STORAGE   READY   DESIRE   TIDB                  READY   DESIRE   AGE
foo              foo              True    pingcap/pd:v4.0.8   13Gi      2       2        pingcap/tikv:v4.0.8   800Gi      3       3        pingcap/tidb:v4.0.8   1       1        13h
bar              bar              True    pingcap/pd:v4.0.8   55Gi      3       3        pingcap/tikv:v4.0.8   20Gi       3       3        pingcap/tidb:v4.0.8   1       1        11m
```

### tkctl info

View the overall information of a `TiDB` cluster.

| **Flag**            | **Abreviation** | **Description** |
| -------------- | ---- | ------------------------------------------ |
| --tidb-cluster | -t   | Specify the `TiDB` cluster to use; use context setting as default |
| --namespace    | -n   | Specify the `namespace` to use;  use context setting as default  |

```
$ tkctl info -t demo-cluster
Name:                    demo-cluster
namepsace:               demo-cluster
CreationTimestamp:       2020-12-19T09:31:29Z
Overview:
​        Phase     Ready     Desired   CPU       Memory    Storage   Version
​        -----     -----     -------   ---       ------    -------   -------
  PD:   Normal    1         1         1         2Gi       10Gi      pingcap/pd:v4.0.8
  TiKV: Normal    3         3         1         2Gi       50Gi      pingcap/tikv:v4.0.8
  TiDB: Normal    1         1         1         2Gi       10Gi      pingcap/tidb:v4.0.8
TiDB Service:            ClusterIP
```

#### tkctl get [component]

Get more detailed information of `TiDB` components. You can query the following components: `pd`, `tikv`, `tidb` and `all` (to query all components).

| **Flag**            | **Abreviation** | **Description**   |
| -------------- | ---- | ------------------------------------------ |
| --tidb-cluster | -t   | Specify the `TiDB` cluster to use; use context setting as default  |
| --namespace    | -n   | Specify the `namespace` to use;  use context setting as default |
| --resource     | -R   | View the resource usage at the same time   |

**Note：** `Metrics API` need to be installed before using `--resource`，refer more information at [Kubernetes Metrics Server](https://github.com/kubernetes-sigs/metrics-server)

```
$ tkctl get tikv -n demo-cluster -t demo-cluster
NAME                  READY   STATUS    RESTARTS   AGE     NODE
demo-cluster-tikv-0   2/2     Running   0          3m19s   172.16.4.155/Follower-1
demo-cluster-tikv-1   2/2     Running   0          4m8s    172.16.4.160/Follower-2
demo-cluster-tikv-2   2/2     Running   0          4m45s   172.16.4.157/Follower-3
```

```
$ tkctl get tikv -R
NAME                  READY   STATUS    MEMORY          CPU   RESTARTS   AGE     NODE
demo-cluster-tikv-0   2/2     Running   2098Mi/2Gi      8m/1  0          3m19s   172.16.4.155/Follower-1
demo-cluster-tikv-1   2/2     Running   2098Mi/2Gi      9m/1  0          4m8s    172.16.4.160/Follower-2
demo-cluster-tikv-2   2/2     Running   2098Mi/2Gi      9m/1  0          4m45s   172.16.4.157/Follower-3
```

### tkctl lpv

View the `Node <-> pv <-> pvc` tree structure of `local pv` in the cluster

```
$ tkctl lpv
node-follower-1:
  ---
  | -> local-pv-d5dad2cf(local-storage)  1476Gi /mnt/disks/local-pv56
  | -> Bound: tidb-cluster-1/tikv-demo-cluster-tikv-0 
  ---
  | -> local-pv-ed2ffe50(local-storage)  1476Gi /mnt/disks/local-pv13
  | -> Available
node-follower-2:
  ---
  | -> local-pv-d5dfg2cf(local-storage)  98Gi /mnt/disks/local-pv87
  | -> Bound: tidb-cluster-1/tikv-demo-cluster-tidb-0 
  ---
  | -> local-pv-ed9wfe50(local-storage)  98Gi /mnt/disks/local-pv34
  | -> Available
  ---
  | -> local-pv-ed9sdwx4(local-storage)  98Gi /mnt/disks/local-pv55
  | -> Available
```