class TodoProject {
    constructor(name) {
        this._name = name;
        this._todos = [];
        this._completedTodos = [];
    }

    insertTodoSorted(array, todo) {
        if (
            !todo.dueDate || !array.length ||
            (array[array.length - 1].dueDate && array[array.length - 1].dueDate < todo.dueDate)
        ) {
            array.push(todo);
            return array.length - 1;
        } else {
            for (let i = 0; i < array.length; i++) {
                if (!array[i].dueDate || array[i].dueDate >= todo.dueDate) {
                    array.splice(i, 0, todo);
                    return i;
                }
            }
        }
    }

    addTodo(todo) {
        return this.insertTodoSorted(this.todos, todo);
    }
    
    completeTodo(index) {
        const [todo] = this.todos.splice(index, 1);
        todo.completed = true;
        this.insertTodoSorted(this.completedTodos, todo);
    }
    
    uncompleteTodo(index) {
        const [todo] = this.completedTodos.splice(index, 1);
        todo.completed = false;
        this.insertTodoSorted(this.todos, todo);
    }
    
    deleteCompletedTodo(todo) {
        const index = this.completedTodos.indexOf(todo);
        if (index !== -1) this.completedTodos.splice(index, 1);
    }
    
    deleteTodo(todo) {
        const index = this.todos.indexOf(todo);
        if (index !== -1) this.todos.splice(index, 1);
    }

    // Getter Setter
    get name() {
        return this._name;
    }
    
    set name(name) {
        if (name) this._name = name;
    }
    
    get completedTodosCount() {
        return this._completedTodos.length;
    }
    
    get todosCount() {
        return this._todos.length;
    }
    
    get todos() {
        return this._todos;
    }
    
    set todos(todos) {
        this._todos = todos;
    }
    
    get completedTodos() {
        return this._completedTodos;
    }
    
    set completedTodos(todos) {
        this._completedTodos = todos;
    }
}


class Project extends TodoProject {
    constructor(name, description) {
        super(name);
        this._description = description;
        this._sections = [];
    }

    addSection(name, index = this.sections.length) {
        const newSection = new TodoProject(name);
        newSection.num = index;
        this._sections.splice(index, 0, newSection);
        for (let i = index + 1; i < this._sections.length; i++) {
            this._sections[i].num = i;
        }
        return newSection;
    }
    
    removeSection(section) {
        const idx = this._sections.indexOf(section);
        if (idx !== -1) {
            this._sections.splice(idx, 1);
        }
    }

    // Getter Setter
    get description() {
        return this._description;
    }
    
    set description(description) {
        if (description) this._description = description;
    }
    
    get todosCount() {
        return (
            this.todos.length +
            this.sections.reduce((acc, section) => acc + section.todosCount, 0)
        );
    }
    
    get completedTodosCount() {
        return (
            this.completedTodos.length +
            this.sections.reduce((acc, section) => acc + section.completedTodosCount, 0)
        );
    }
    
    get sections() {
        return this._sections;
    }
    
    set sections(sections) {
        this._sections = sections;
    }
}

export { Project, TodoProject };