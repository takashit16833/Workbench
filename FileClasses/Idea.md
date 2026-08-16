---
filesPaths:
  - Ideas
icon: lightbulb
fields:
  - name: projects
    id: iProjects
    type: MultiFile
    options:
      baseFile: Dashboard.base
      viewName: Projects
    path: ""
  - name: status
    id: iStatus
    type: Select
    options:
      sourceType: ValuesList
      valuesList:
        "1": active
        "2": accepted
        "3": rejected
    path: ""
  - name: review_gate
    id: iReviewGate
    type: Input
    options:
      required: true
    path: ""
  - name: created
    id: iCreated
    type: Date
    options: {}
    path: ""
---
