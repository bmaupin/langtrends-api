To deploy this application to OpenShift:

```
$ oc new-project <project_name>
$ oc process -f template.yaml --param-file=../.env | oc create -f - -n <project_name>
```
