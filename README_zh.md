# new-tkctl-nodejs

### How to use

1.  `git clone` 到某路径
2.  在有 `package.json` 的路径下执行 `npm install --save` 
3.  输入 `./index.js` 即可使用(将下面所有 `tkctl` 替换成 `./index.js` )
4.  或在该路径下使用 `npm link` ，即可以 `tkctl` 使用该程序

PS: 可以参考[如何在CentOS 7安装Node.js和npm](https://linuxize.com/post/how-to-install-node-js-on-centos-7/)来安装较新版本的Node.js，保证组件正常使用

### Introduction

此 `tkctl` 工具使用Node.js实现，是旧有的 `tkctl` 工具的重构(使用Golang实现，已经废弃)

#### 实现的旧有功能

| 参数            | 功能                              |
| --------------- | --------------------------------- |
| version         | 查看 `tkctl` 和 `tidb-operator` 的版本 |
| use             | 指定上下文使用的 `TiDB` 集群          |
| reset           | 清空目前设置的上下文              |
| clean           | 删除存储上下文使用的json文件              |
| list            | 查看 `Kubernetes` 集群中的 `TiDB` 集群           |
| info            | 查看 `TiDB` 集群的概要信息            |
| get [component] | 获取 `TiDB` 集群中组件的详细信息    |
| lpv        | 获取集群中 `local pv` 的树形结构     |


#### 较旧版新实现的功能

| 参数 | 功能 |
| ---- | ---- |
| /    | /    |

#### 未实现的旧有功能

| 参数             | 旧有功能                    | 未实现原因         |
| ---------------- | --------------------------- | ------------------ |
| debug [pod_name] | 诊断 `TiDB` 集群中的 `Pod`      | 暂未实现           |
| options          | 展示 `tkctl` 的所有的全局参数  | “-h”或“--help”即可 |
| help [command]   | 展示各个子命令的帮助信息      | “-h”或“--help”即可 |
| ctop             | 查看 `Pod` 或 `Node` 的资源占用     | 暂未实现 |

### tkctl version

输出本地 `tkctl` 和集群中 `tidb-operator` 的版本

```
$ tkctl version 
Welcome to tkctl {$tkctl_version}.
TiDB Controller Manager Version: pingcap/tidb-operator:v1.1.6
TiDB Scheduler Version: pingcap/tidb-operator:v1.1.6
```

### tkctl use

设置上下文参数，设置后命令会默认使用该参数，如 `tkctl info` 如果没有输入新的参数则默认展示上下文中设置的 `namespace` 下的 `tidbcluster` （如果有设置上写文且在使用这些命令时没有输入参数，会提示正在使用的上下文）

| 参数          | 缩写 | 说明                   |
| ------------- | ---- | ---------------------- |
| --namespace   | -n   | 指定使用的命名空间     |
| --tidbcluster | -t   | 指定使用的 `TiDB` 集群 |

```bash
$ tkctl use -n foo -t demo_cluster
Context set: [ NameSpace = foo ], [ TidbCluster = demo_cluster ].
```

 目前使用的是文件存储这两个上下文的参数。经过测试，读写需要的时间在1~3ms，考虑到集群中大多数的命令都需要主机间通信，每条 `kubectl` 命令耗时都在100~200ms，目前对于上下文功能的实现可以接受。

### tkctl reset 

该命令用于清空目前设置的上下文信息

```
$ tkctl reset
Context reset: [ NameSpace = default ], [ TidbCluster = default ].
```

### tkctl reset 

删除存储上下文时使用的文件

```
$ tkctl clean
Context json file cleaned.
```

### tkctl list

 该命令用于列出所有已安装的 `TiDB` 集群：

| 参数             | 缩写 | 说明                                |
| ---------------- | ---- | ----------------------------------- |
| --all-namespaces | -A   | 是否查询 `Kubernetes` 集群中所有的 `namespace`|
| --namespace      | -n   | 指定 `namespace`                       |

 
```
$ tkctl list -A 
NAMESPACE        NAME             READY   PD                  STORAGE   READY   DESIRE   TIKV                  STORAGE   READY   DESIRE   TIDB                  READY   DESIRE   AGE
foo              foo              True    pingcap/pd:v4.0.8   13Gi      2       2        pingcap/tikv:v4.0.8   800Gi      3       3        pingcap/tidb:v4.0.8   1       1        13h
bar              bar              True    pingcap/pd:v4.0.8   55Gi      3       3        pingcap/tikv:v4.0.8   20Gi       3       3        pingcap/tidb:v4.0.8   1       1        11m
```

### tkctl info

该命令用于展示 `TiDB` 集群的信息。

| 参数           | 缩写 | 说明                                       |
| -------------- | ---- | ------------------------------------------ |
| --tidb-cluster | -t   | 指定 `TiDB` 集群，默认为当前使用的 `TiDB` 集群 |
| --namespace    | -n   | 指定 `namespace`，默认为当前使用的 `namespace`   |

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

该命令用于获取 TiDB 集群中组件的详细信息。可选的组件 ( `component` ) 有： `pd`、`tikv`、`tidb` 和 `all`（用于同时查询所有组件）。

| 参数           | 缩写 | 说明                                       |
| -------------- | ---- | ------------------------------------------ |
| --tidb-cluster | -t   | 指定 `TiDB` 集群，默认为当前使用的 `TiDB` 集群 |
| --namespace    | -n   | 指定 `namespace` ，默认为当前使用的 `namespace` |
| --resource     | -R   | 同时显示各个组件占用的资源                 |

**注意：**`--resource` 选项使用之前需要安装 `Metrics API` ，具体使用可参考[Kubernetes Metrics Server文档](https://github.com/kubernetes-sigs/metrics-server)

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

输出 `节点 <-> pv <-> pvc` 的三级树形结构

```
$ tkctl lpv
node-follower-1:
  | -> local-pv-d5dad2cf(local-storage)  1476Gi /mnt/disks/local-pv56
  | -> Bound: tidb-cluster-1/tikv-demo-cluster-tikv-0 
  ---
  | -> local-pv-ed2ffe50(local-storage)  1476Gi /mnt/disks/local-pv13
  | -> Available
node-follower-2:
  | -> local-pv-d5dfg2cf(local-storage)  98Gi /mnt/disks/local-pv87
  | -> Bound: tidb-cluster-1/tikv-demo-cluster-tidb-0 
  ---
  | -> local-pv-ed9wfe50(local-storage)  98Gi /mnt/disks/local-pv34
  | -> Available
  ---
  | -> local-pv-ed9sdwx4(local-storage)  98Gi /mnt/disks/local-pv55
  | -> Available
```