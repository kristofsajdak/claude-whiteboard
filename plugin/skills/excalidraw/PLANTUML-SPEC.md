# PlantUML Syntax Specification

Reference for parsing and generating PlantUML diagrams.

## Activity Diagrams (New Syntax)

### Basic Structure

```plantuml
@startuml
start
:Step 1;
:Step 2;
stop
@enduml
```

### Swimlanes

```plantuml
@startuml
|Actor 1|
start
:Action in lane 1;
|Actor 2|
:Action in lane 2;
|Actor 1|
:Back to lane 1;
stop
@enduml
```

### Conditionals

```plantuml
@startuml
start
if (condition?) then (yes)
  :Action A;
else (no)
  :Action B;
endif
stop
@enduml
```

### Parallel (Fork/Join)

```plantuml
@startuml
start
fork
  :Parallel A;
fork again
  :Parallel B;
end fork
stop
@enduml
```

### Repeat/While Loops

```plantuml
@startuml
start
repeat
  :Action;
repeat while (condition?) is (yes)
->no;
stop
@enduml
```

### Notes

```plantuml
@startuml
start
:Action;
note right
  This is a note
end note
stop
@enduml
```

## Class Diagrams

### Basic Class

```plantuml
@startuml
class ClassName {
  -privateField: Type
  +publicField: Type
  #protectedField: Type
  --
  +publicMethod(): ReturnType
  -privateMethod(param: Type): void
}
@enduml
```

### Relationships

```plantuml
@startuml
ClassA <|-- ClassB : extends
ClassA *-- ClassC : composition
ClassA o-- ClassD : aggregation
ClassA --> ClassE : association
ClassA ..> ClassF : dependency
@enduml
```

### Interfaces

```plantuml
@startuml
interface IName {
  +method(): void
}
class Implementation implements IName
@enduml
```

## Sequence Diagrams

### Basic Messages

```plantuml
@startuml
participant Alice
participant Bob

Alice -> Bob: Sync message
Alice ->> Bob: Async message
Bob --> Alice: Response
Bob -->> Alice: Async response
@enduml
```

### Lifelines and Activation

```plantuml
@startuml
Alice -> Bob: Request
activate Bob
Bob -> Charlie: Forward
activate Charlie
Charlie --> Bob: Reply
deactivate Charlie
Bob --> Alice: Response
deactivate Bob
@enduml
```

### Notes

```plantuml
@startuml
Alice -> Bob: message
note left: This is a note
note right of Bob: Note on Bob
note over Alice,Bob: Spanning note
@enduml
```

## State Diagrams

### Basic States

```plantuml
@startuml
[*] --> State1
State1 --> State2 : Event
State2 --> [*]
@enduml
```

### Composite States

```plantuml
@startuml
state CompositeState {
  [*] --> Inner1
  Inner1 --> Inner2
  Inner2 --> [*]
}
@enduml
```

## Parsing Tips

When converting PlantUML to natural language:

1. **Identify diagram type** from `@startuml` block content
2. **Extract actors/participants** from declarations or swimlane markers
3. **Parse flow** by following arrows and control structures
4. **Capture labels** from arrow annotations and notes
5. **Preserve relationships** (inheritance, composition, etc.)

## Generation Tips

When converting natural language to PlantUML:

1. **Choose appropriate diagram type** based on description
2. **Identify actors/classes/states** from the description
3. **Map flow steps** to PlantUML syntax
4. **Add appropriate styling** (colors, notes) when specified
5. **Use proper arrow types** for relationship semantics
