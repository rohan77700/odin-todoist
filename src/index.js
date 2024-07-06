console.log('Odin todoist');

import { format, isToday, isTomorrow, isWithinInterval, addDays, isPast, endOfDay, isEqual } from "date-fns";

import TodoList from "./todolist.js";
import Task from "./task.js";
import { Project, TodoProject } from "./project.js";


window.addEventListener('load', () => {
    const todayDate = document.getElementById('todayDate');
    todayDate.textContent = new Date().getUTCDate().toString().length != 1
    ? new Date().getUTCDate().toString()
    : '0' + new Date().getUTCDate().toString();
});


let curProject = 'Inbox';
let curProjectIndex = 0;

const todayTodos = new Project('Today');
todayTodos.addSection('Overdue');

const domProjectMap = new Map();
const domCompletedProjectMap = new Map();
const domTodoCountMap = new Map();
const domProjectLinkMap = new Map();

domProjectLinkMap.set(todayTodos, document.getElementById('today'));
domProjectLinkMap.set(TodoList.projects[0], document.getElementById('inbox'));
domTodoCountMap.set(todayTodos, document.getElementById('today').querySelector(".project-todo-count span"));

const projectOption = document.querySelector(".project-option");

const updateTodoForm = document.querySelector(".update-todo-form");
const updateTodoTitle = updateTodoForm.querySelector(".todo-title-input");
const updateTodoDescription = updateTodoForm.querySelector(".todo-desc-input");
const updateTodoDate = updateTodoForm.querySelector(".duedate-input");
const updateTodoTime = updateTodoForm.querySelector(".time-input");
const updateTodoPriority = updateTodoForm.querySelector('select[name="priority"]');
const updateTodoProject = updateTodoForm.querySelector('select[name="project"]');
const cancelUpdateBtn = updateTodoForm.querySelector(".cancel-btn");

const addSectionForm = document.querySelector(".add-section");
const inlineForm = document.querySelector(".inline-form");
const modalForm = document.querySelector(".modal-form");

function addDateTimeBtnEventListeners(e) {
    e.preventDefault();
  
    const tag = e.target.tagName;
    if (tag === "BUTTON" || tag === "svg" || tag === "SPAN") {
        const btn = e.target.closest("button");
        if (btn && !btn.disabled) btn.nextElementSibling.showPicker();
    }
}

inlineForm.querySelector(".input-btn-row").addEventListener("click", addDateTimeBtnEventListeners);
updateTodoForm.querySelector(".input-btn-row").addEventListener("click", addDateTimeBtnEventListeners);
modalForm.querySelector(".input-btn-row").addEventListener("click", addDateTimeBtnEventListeners);

function savedTodoLocalStorage() {
    const jsonString = JSON.stringify(TodoList, (key, value) => {
        if (key === "_project") return "";
        return value;
    });
    localStorage.setItem("todoList", jsonString);
}

function removeDateTimeClasses(e) {
    e.classList.remove("today", "tomorrow", "this-week", "overdue");
}

document.querySelectorAll(".cancel-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
        e.preventDefault();
    
        if (btn.form.classList.contains("inline-form")) {
            main.querySelectorAll(".add-todo-btn").forEach((button) => button.style.display = "");
        }
        btn.form.style.display = "none";

        const title = btn.form.querySelector(".todo-title-input");
        title.textContent = "";
        title.nextElementSibling.style.display = "";
        
        const desc = btn.form.querySelector(".todo-desc-input");
        desc.textContent = "";
        desc.nextElementSibling.style.display = "";

        const date = btn.form.querySelector('input[type="date"]');
        date.value = "";
        removeDateTimeClasses(date.previousElementSibling);
        date.previousElementSibling.lastElementChild.textContent = "Due date";

        const time = btn.form.querySelector('input[type="time"]');
        time.value = "";
        time.previousElementSibling.disabled = true;
        removeDateTimeClasses(time.previousElementSibling);
        time.previousElementSibling.lastElementChild.textContent = "Due time";
        time.nextElementSibling.style.display = "none";

        const priority = btn.form.querySelector('select[name="priority"]');
        priority.value = "4";

        btn.form.querySelector(".confirm-btn").disabled = true;
    });
});

document.querySelectorAll(".add-task-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
        e.preventDefault();
    
        const form = btn.closest("form");
        
        const title = form.querySelector(".todo-title-input").textContent;
        const desc = form.querySelector(".todo-desc-input").textContent;
        const date = form.querySelector('input[type="date"]').value;
        const time = form.querySelector('input[type="time"]').value;
        const priority = form.querySelector('select[name="priority"]').value;
        const project = form.querySelector(".project-selector").value;
        
        if (!title) return;
        if (!date && time) return;
        if (!priority) return;
        if (!project) return;
    
        const projectData = project.split("/");
        const projectIdx = projectData[0];
        const sectionIdx = projectData[1];

        let todoContainer;
        if (sectionIdx === "") todoContainer = TodoList.projects[+projectIdx];
        else todoContainer = TodoList.projects[+projectIdx].sections[+sectionIdx];

        const todo = new Task(
            title,
            desc,
            date ? new Date(date + " " + time) : null,
            date ? (time ? true : false) : false,
            +priority,
            todoContainer,
            false
        );
        
        if (!todo.dueTime && todo.dueDate) todo.dueDate = endOfDay(todo.dueDate);

        let idx = todoContainer.addTodo(todo);
        if (todo.dueDate && isToday(todo.dueDate)) {
            idx = todayTodos.addTodo(todo);
            domTodoCountMap.get(todayTodos).textContent = todayTodos.todosCount;
        }

        savedTodoLocalStorage();

        domTodoCountMap.get(TodoList.projects[+projectIdx]).textContent = TodoList.projects[+projectIdx].todosCount;

        if (+projectIdx === curProjectIndex) {
            createTodo(domProjectMap.get(todo.project), todo, idx);
        } else if (curProjectIndex === -1) {
            if (todo.dueDate && isToday(todo.dueDate)) {
                createTodo(domProjectMap.get(todayTodos), todo, idx);
            }
        }

        btn.form.querySelector(".cancel-btn").click();
    });
});

function addDateTimeClasses(input) {
    if (input.nextElementSibling.value !== "") {
        const date = new Date(input.nextElementSibling.value);
        input.lastElementChild.textContent = format(date, "d MMM");
        input.nextElementSibling.nextElementSibling.disabled = false;

        if (!isToday(date) && isPast(date)) return;
    
        const today = new Date();
        const nextWeek = addDays(today, 7);

        if (isToday(date)) {
            input.lastElementChild.textContent = "Today";
            input.classList.add("today");
            if (input.nextElementSibling.nextElementSibling.nextElementSibling.value) {
                input.nextElementSibling.nextElementSibling.classList.add("today");
            }
        } else if (isTomorrow(date)) {
            input.lastElementChild.textContent = "Tomorrow";
            input.classList.add("tomorrow");
            if (input.nextElementSibling.nextElementSibling.nextElementSibling.value) {
                input.nextElementSibling.nextElementSibling.classList.add("tomorrow");
            }
        } else if (isWithinInterval(date, { start: today, end: nextWeek })) {
            input.lastElementChild.textContent = format(date, "EEEE");
            input.classList.add("this-week");
            if (input.nextElementSibling.nextElementSibling.nextElementSibling.value) {
                input.nextElementSibling.nextElementSibling.classList.add("this-week");
            }
        }
    } else {
        input.lastElementChild.textContent = "Due date";
        input.nextElementSibling.nextElementSibling.disabled = true;
        input.parentElement.querySelector(".clear-time-input").click();
    }
}

document.querySelectorAll(".duedate-input").forEach((input) => {
    input.nextElementSibling.setAttribute("min", format(new Date(), "yyyy-MM-dd"));
    input.nextElementSibling.addEventListener("input", (e) => {
        removeDateTimeClasses(input);
        removeDateTimeClasses(input.nextElementSibling.nextElementSibling);

        addDateTimeClasses(input);
    });
});

const formTextInputs = document.querySelectorAll('.todo-input-text div[contenteditable="true"]');
formTextInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
        const addTodo = input.closest("form").querySelector(".confirm-btn");
        if (input.textContent === "") {
            input.nextElementSibling.style.display = "";
            if (input.classList.contains("todo-title-input")) addTodo.disabled = true;
        } else {
            input.nextElementSibling.style.display = "none";
            if (input.classList.contains("todo-title-input")) addTodo.disabled = false;
        }
    });
});

document.querySelectorAll(".clear-time-input").forEach((clearTimeInput) => {
    clearTimeInput.addEventListener("click", (e) => {
        e.preventDefault();
    
        const inputEvent = new Event("input", { bubbles: false });
        const input = e.target.previousElementSibling;
        input.value = "";
        input.dispatchEvent(inputEvent);
    });
});

document.querySelectorAll(".time-input").forEach((input) => {
    input.nextElementSibling.addEventListener("input", (e) => {
        if (input.nextElementSibling.value !== "") {
            if (input.previousElementSibling.value) {
                const date = new Date(input.previousElementSibling.value);
                if (isToday(date)) {
                    if (!input.closest(".overdue-section") && e.isTrusted) {
                        const [inputHrs, inputMins] = input.nextElementSibling.value.split(":");
                        const curHrs = new Date().getHours();
                        const curMins = new Date().getMinutes();

                        if (+inputHrs < curHrs || (+inputHrs === curHrs && +inputMins <= curMins)) {
                            input.parentElement.querySelector(".clear-time-input").click();
                            return;
                        }
                    }
                }
            }
      
            input.nextElementSibling.nextElementSibling.style.display = "block";
            input.lastElementChild.textContent = input.nextElementSibling.value;
            if (input.previousElementSibling.previousElementSibling.classList.contains("today"))
                input.classList.add("today");
            else if (input.previousElementSibling.previousElementSibling.classList.contains("tomorrow"))
                input.classList.add("tomorrow");
            else if (input.previousElementSibling.previousElementSibling.classList.contains("this-week"))
                input.classList.add("this-week");
        } else {
            input.nextElementSibling.nextElementSibling.style.display = "none";
            input.lastElementChild.textContent = "Due time";
            removeDateTimeClasses(input);
        }
    });
});

const saved = localStorage.getItem("todoList");
const projectHTML = `
    <li>
        <a class="li-a">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill='none' viewBox="0 0 24 24" class="project_icon" style="color: #db4c3f;">
                <path fill="currentColor" fill-rule="evenodd" d="M15.994 6.082a.5.5 0 1 0-.987-.164L14.493 9h-3.986l.486-2.918a.5.5 0 1 0-.986-.164L9.493 9H7a.5.5 0 1 0 0 1h2.326l-.666 4H6a.5.5 0 0 0 0 1h2.493l-.486 2.918a.5.5 0 1 0 .986.164L9.507 15h3.986l-.486 2.918a.5.5 0 1 0 .987.164L14.507 15H17a.5.5 0 1 0 0-1h-2.326l.667-4H18a.5.5 0 1 0 0-1h-2.493l.487-2.918ZM14.327 10H10.34l-.667 4h3.987l.667-4Z" clip-rule="evenodd"></path>
            </svg>
            <span class="project-name"></span>
        </a>
        <div class="project-todo-count">
            <span>0</span>
        </div>
    </li>
`;

const addProjectBtn = document.querySelector(".add-project-btn");
const addProjectForm = document.querySelector(".add-project-form");
const projectContainer = document.querySelector("#projects-container ul");

if (saved) {
    const savedTodoList = JSON.parse(saved);

    TodoList.projects = savedTodoList.projects.map((project) => {
        return Object.assign(new Project(), project);
    });

    TodoList.projects.forEach((project, idx) => {
        project.sections = project.sections.map((section) => {
            return Object.assign(new TodoProject(), section);
        });

        if (idx !== 0) createProjectDOM(project);

        project.sections.forEach((section) => {
            section.todos = section.todos.map((todo) => {
                todo._dueDate = todo._dueDate ? new Date(todo._dueDate) : todo._dueDate;
                todo._project = section;
           
                const newTodo = Object.assign(new Task(), todo);
                if (isToday(newTodo.dueDate) && !isPast(newTodo.dueDate)) todayTodos.addTodo(newTodo);
                if (isPast(newTodo.dueDate)) todayTodos.sections[0].addTodo(newTodo);

                return newTodo;
            });

            section.completedTodos = section.completedTodos.map((todo) => {
                todo._dueDate = todo._dueDate ? new Date(todo._dueDate) : todo._dueDate;
                todo._project = section;
                
                const newTodo = Object.assign(new Task(), todo);
                return newTodo;
            });
        });

        project.todos = project.todos.map((todo) => {
            todo._dueDate = todo._dueDate ? new Date(todo._dueDate) : todo._dueDate;
            todo._project = project;
      
            const newTodo = Object.assign(new Task(), todo);
            if (isToday(newTodo.dueDate) && !isPast(newTodo.dueDate)) todayTodos.addTodo(newTodo);
            if (isPast(newTodo.dueDate)) todayTodos.sections[0].addTodo(newTodo);
            
            return newTodo;
        });
      
        project.completedTodos = project.completedTodos.map((todo) => {
            todo._dueDate = todo._dueDate ? new Date(todo._dueDate) : todo._dueDate;
            todo._project = project;

            const newTodo = Object.assign(new Task(), todo);
            return newTodo;
        });
    });

    document.querySelector(".inbox-count span").textContent = TodoList.projects[0].todosCount;
    document.querySelector("#today div span").textContent = todayTodos.todosCount;
  
    if (todayTodos.sections[0].todosCount !== 0) {
        domTodoCountMap.get(todayTodos).classList.add("overdue");
    }
}

domTodoCountMap.set(
    TodoList.projects[0],
    document.querySelector("#inbox").querySelector(".project-todo-count span")
);

const projectSelector = Array.from(document.querySelectorAll(".project-selector"));

function populateProjectSelectorOptions() {
    projectSelector.forEach((selector) => selector.innerHTML = "");
    
    TodoList.projects.forEach((project, projectIdx) => {
        const option = document.createElement("option");
        option.value = projectIdx + "/";
        option.textContent = project.name;
        projectSelector.forEach((selector) => selector.appendChild(option.cloneNode(true)));
        
        project.sections.forEach((section, sectionIdx) => {
            const option = document.createElement("option");
            option.value = `${projectIdx}/${sectionIdx}`;
            option.textContent = `${project.name} > ${section.name}`;
            projectSelector.forEach((selector) => selector.appendChild(option.cloneNode(true)));
        });
    });
}
// clean
const main = document.querySelector("main");
const sectionsList = main.querySelector("ul#sections-list");

const liHTML = `
    <li>
        <section class="section">
            <header class="section-header">
                <div class="collapse-list">
                    <svg width="24" height="24">
                        <path fill='none' stroke=" currentColor" d="M16 10l-4 4-4-4"></path>
                    </svg>
                </div>
                <div class="section-info">
                    <button class="section-name">
                        <span></span>
                    </button>
                    <span></span>
                </div>
                <button class="todo-more-options">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                        <g fill='none'stroke="currentColor" stroke-linecap="round" transform="translate(3 10)">
                            <circle cx="2" cy="2" r="2"></circle>
                            <circle cx="9" cy="2" r="2"></circle>
                            <circle cx="16" cy="2" r="2"></circle>
                        </g>
                    </svg>
                    <div class="delete-section delete-project hide">Delete section</div>
                </button>
            </header>
            <ul class="tasks-list"></ul>
            <li>
                <button class="add-todo-btn">
                    <span>
                        <svg width="13" height="13">
                            <path d="M6 6V.5a.5.5 0 011 0V6h5.5a.5.5 0 110 1H7v5.5a.5.5 0 11-1 0V7H.5a.5.5 0 010-1H6z" fill="currentColor" fill-rule="evenodd"></path>
                        </svg>
                    </span>
                    <span>Add task</span>
                </button>
            </li>
            <ul class="tasks-list completed-tasks-list hide">
        </section>
        <button class="add-section-btn">Add a section</button>
    </li>
`;
const todoHTML = `
    <li class="todo">
        <button class="checkbox-container">
            <div class="checkbox">
                <svg width="24" height="24">
                    <path fill="currentColor" d="M11.23 13.7l-2.15-2a.55.55 0 0 0-.74-.01l.03-.03a.46.46 0 0 0 0 .68L11.24 15l5.4-5.01a.45.45 0 0 0 0-.68l.02.03a.55.55 0 0 0-.73 0l-4.7 4.35z"></path>
                </svg>
            </div>
        </button>
        <div class="todo-info">
            <div class="todo-title-desc">
                <span class="todo-title"></span>
                <span class="todo-desc"></span>
            </div>
            <div class="due-date">
                <span></span>
                <span></span>
            </div>
            <div class="todo-options">
                <button class="edit-todo">
                    <svg width="24" height="24" style=''>
                        <g fill='none' fill-rule="evenodd">
                            <path fill="currentColor" d="M9.5 19h10a.5.5 0 110 1h-10a.5.5 0 110-1z"></path>
                            <path stroke="currentColor" d="M4.42 16.03a1.5 1.5 0 00-.43.9l-.22 2.02a.5.5 0 00.55.55l2.02-.21a1.5 1.5 0 00.9-.44L18.7 7.4a1.5 1.5 0 000-2.12l-.7-.7a1.5 1.5 0 00-2.13 0L4.42 16.02z"></path>
                        </g>
                    </svg>
                </button>
                <button class="delete" style="color: #db4c3f;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24 style="color: #db4c3f;">
                        <g fill='none' fill-rule="evenodd">
                            <path d="M0 0h24v24H0z"></path>
                            <rect width="14" height="1" x="5" y="6" fill="currentColor" rx="0.5"></rect>
                            <path fill="currentColor" d="M10 9h1v8h-1V9zm3 0h1v8h-1V9z"></path>
                            <path stroke="currentColor" d="M17.5 6.5h-11V18A1.5 1.5 0 008 19.5h8a1.5 1.5 0 001.5-1.5V6.5zm-9 0h7V5A1.5 1.5 0 0014 3.5h-4A1.5 1.5 0 008.5 5v1.5z"></path>
                        </g>
                    </svg>
                </button>
            </div>
        </div>
    </li>
`;

const addSectionConfirm = addSectionForm.querySelector(".add-section-confirm");
const cancelAddSection = addSectionForm.querySelector(".cancel-section");
cancelAddSection.form.firstElementChild.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cancelAddSection.click();
});

const deleteOverlay = document.querySelector(".overlay");
const deleteModal = document.querySelector(".delete-object-modal");
const deleteObjectInfo = document.querySelector(".delete-object-info");
const deleteConfirmBtn = document.querySelector(".delete-object-btn");
const cancelDeleteBtn = document.querySelector(".cancel-delete-btn");
deleteOverlay.addEventListener("click", (e) => {
    if (e.target === deleteOverlay) {
        deleteOverlay.style.display = "";
        cancelDeleteBtn.click();
    }
});
deleteModal.querySelector(".close-modal").addEventListener("click", () => cancelDeleteBtn.click());

function createSectionDOM(name, idx, section) {
    const div = document.createElement("div");
    div.innerHTML = liHTML;
    const sectionLi = div.firstElementChild;
  
    domProjectMap.set(section, sectionLi.querySelector(".tasks-list"));
    domCompletedProjectMap.set(section, sectionLi.querySelector(".completed-tasks-list"));
    
    sectionsList.insertBefore(sectionLi, sectionsList.children[idx]);

    const collapseBtn = sectionLi.querySelector(".collapse-list");
    collapseBtn.addEventListener("click", () => {
        domProjectMap.get(section).classList.toggle("collapsed");
        domProjectMap.get(section).nextElementSibling.classList.toggle("collapsed");
        collapseBtn.classList.toggle("collapsed");
    });

    if (!name) sectionLi.querySelector(".section-header").innerHTML = "";
    else sectionLi.querySelector(".section-name").textContent = name;

    const addSectionBtn = sectionLi.querySelector(".add-section-btn");
    const addTodoBtn = sectionLi.querySelector(".add-todo-btn");

    function addTodoBtnClick(e) {
        updateTodoForm.querySelector(".cancel-btn").click();
        addTodoBtn.closest("li").appendChild(inlineForm);
        const dateInputBtn = inlineForm.querySelector(".duedate-input");

        if (curProjectIndex === -1) {
            dateInputBtn.lastElementChild.textContent = "Today";
            dateInputBtn.classList.add("today");
            dateInputBtn.nextElementSibling.value = new Date().toISOString().slice(0, 10);
            dateInputBtn.nextElementSibling.nextElementSibling.disabled = false;
            inlineForm.querySelector(".project-selector").value = "0/";
        } else {
            let sectionIdx = TodoList.projects[curProjectIndex].sections.indexOf(section);
            if (sectionIdx === -1) sectionIdx = "";
            
            inlineForm.querySelector(".project-selector").value = `${curProjectIndex}/${sectionIdx}`;
            dateInputBtn.lastElementChild.textContent = "Due date";
            dateInputBtn.classList.remove("today");
            dateInputBtn.nextElementSibling.value = "";
            dateInputBtn.nextElementSibling.nextElementSibling.disabled = true;
        }
        inlineForm.style.display = "block";
        inlineForm.querySelector(".todo-title-input").focus();
        main.querySelectorAll(".add-todo-btn").forEach((btn) => btn.style.display = "none");
    }
            
    if (curProjectIndex !== -1) {
        function addSectionConfirmBinding(e) {
            e.preventDefault();
            
            const sectionName = sectionNameInput.value;
            
            let idx = TodoList.projects[curProjectIndex].sections.indexOf(section) + 1;
            const newSection = TodoList.projects[curProjectIndex].addSection(sectionName, idx);
      
            populateProjectSelectorOptions();
      
            savedTodoLocalStorage();
      
            createSectionDOM(sectionName, idx + 1, newSection);
            cancelAddSection.click();
        }

        function resetFormAndListeners(e) {
            e.preventDefault();
      
            addSectionConfirm.disabled = true;
            addSectionForm.previousElementSibling.style.display = "";
            addSectionForm.style.display = "none";
            addSectionForm.remove();
            cancelAddSection.form.firstElementChild.value = "";
            addSectionConfirm.removeEventListener("click", addSectionConfirmBinding);
            cancelAddSection.removeEventListener("click", resetFormAndListeners);
        }

        addSectionBtn.addEventListener("click", () => {
            sectionLi.appendChild(addSectionForm);
            addSectionForm.style.display = "flex";

            addSectionConfirm.addEventListener("click", addSectionConfirmBinding);
            cancelAddSection.addEventListener("click", resetFormAndListeners);

            addSectionBtn.style.display = "none";
            addSectionForm.querySelector("input").focus();
        });

        addTodoBtn.addEventListener("click", addTodoBtnClick);
    } else {
        if (name !== "") {
            addTodoBtn.parentElement.remove();
            sectionLi.classList.add("overdue-section");
            if (section.todos.length === 0) sectionLi.remove();
        } else addTodoBtn.addEventListener("click", addTodoBtnClick);
        
        addSectionBtn.remove();
    }

    const tasksList = sectionLi.querySelector(".tasks-list:first-of-type");
    const completedTasksList = sectionLi.querySelector(".completed-tasks-list");
    if (completedShown) completedTasksList.classList.remove("hide");

    section.todos.forEach((todo, idx) => createTodo(tasksList, todo, idx));
    section.completedTodos.forEach((completedTodo, idx) => createTodo(completedTasksList, completedTodo, idx));

    const sectionMoreOptions = sectionLi.querySelector(".todo-more-options");
    if (sectionMoreOptions) {
        function deleteSection(e) {
            e.preventDefault();
      
            inlineForm.querySelector(".cancel-btn").click();
            TodoList.projects[curProjectIndex].removeSection(section);
            
            populateProjectSelectorOptions();
      
            domTodoCountMap.get(TodoList.projects[curProjectIndex]).textContent = TodoList.projects[curProjectIndex].todosCount;
            section.todos.forEach((todo) => {
                if (isToday(todo.dueDate)) todayTodos.deleteTodo(todo);
                if (isPast(todo.dueDate)) todayTodos.sections[0].deleteTodo(todo);
            });
                
            domTodoCountMap.get(todayTodos).textContent = todayTodos.todosCount;
            if (todayTodos.sections[0].todos.length === 0) {
                domTodoCountMap.get(todayTodos).classList.remove("overdue");
            }
      
            domProjectMap.delete(section);
            domCompletedProjectMap.delete(section);
            sectionLi.classList.add("removed");
            sectionLi.addEventListener("transitionend", () => sectionLi.remove());
      
            savedTodoLocalStorage();
            cancelDeleteBtn.click();
        }

        function cancelSectionDelete(e) {
            e.preventDefault();
            
            deleteOverlay.style.display = "none";
            deleteModal.remove();
            deleteConfirmBtn.removeEventListener("click", deleteSection);
            cancelDeleteBtn.removeEventListener("click", cancelSectionDelete);
        }

        const deleteSectionBtn = sectionMoreOptions.lastElementChild;
        deleteSectionBtn.addEventListener("click", (e) => {
            e.preventDefault();
            
            deleteOverlay.style.display = "block";
            deleteOverlay.appendChild(deleteModal);
            deleteObjectInfo.textContent = `${section.name} with ${section.todosCount} tasks`;
            deleteConfirmBtn.addEventListener("click", deleteSection);
            cancelDeleteBtn.addEventListener("click", cancelSectionDelete);
        });
        sectionMoreOptions.addEventListener("click", (e) => {
            e.preventDefault();
      
            sectionMoreOptions.firstElementChild.classList.add("hide");
            deleteSectionBtn.classList.remove("hide");
        });
    }

    return sectionLi;
}
 
function addRemoveCompleteClass(todo, todoElement) {
    if (todo.completed) {
        todoElement.querySelector(".todo-title").classList.add("completed");
        todoElement.querySelector(".checkbox").classList.add("completed");
    } else {
        todoElement.querySelector(".todo-title").classList.remove("completed");
        todoElement.querySelector(".checkbox").classList.remove("completed");
    }
}

function syncTodoWithTodoDOM(todoElement, todo) {
    const checkBox = todoElement.querySelector(".checkbox");
    checkBox.classList.remove("checkbox-p1", "checkbox-p2", "checkbox-p3");
    
    if (todo.priority < 4) checkBox.classList.add(`checkbox-p${todo.priority}`);
  
    todoElement.querySelector(".todo-title").textContent = todo.title;
    todoElement.querySelector(".todo-desc").textContent = todo.description;

    addRemoveCompleteClass(todo, todoElement);

    const today = new Date();
    const nextWeek = addDays(today, 7);
    const nextWeekEnd = endOfDay(nextWeek);
    if (todo.dueDate) {
        todoElement.querySelector(".due-date").insertAdjacentHTML(
            "afterbegin",
            `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" class="calendar_icon"> 
                <path fill-rule="evenodd" clip-rule="evenodd" d="M9.5 1h-7A1.5 1.5 0 001 2.5v7A1.5 1.5 0 002.5 11h7A1.5 1.5 0 0011 9.5v-7A1.5 1.5 0 009.5 1zM2 2.5a.5.5 0 01.5-.5h7a.5.5 0 01.5.5v7a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5v-7zM8.75 8a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM3.5 4a.5.5 0 000 1h5a.5.5 0 000-1h-5z" fill="currentColor"></path> 
            </svg>`
        );
    
        let date;
        if (isToday(todo.dueDate)) {
            date = "Today";
            todoElement.querySelector(".due-date").classList.add("today");
        } else if (isTomorrow(todo.dueDate)) {
            date = "Tomorrow";
            todoElement.querySelector(".due-date").classList.add("tomorrow");
        } else if (
            isWithinInterval(todo.dueDate, { start: today, end: nextWeekEnd })
        ) {
            date = format(todo.dueDate, "EEEE");
            todoElement.querySelector(".due-date").classList.add("this-week");
        } else {
            date = format(todo.dueDate, "d MMM");
        }
    
        if (!todo.completed && isPast(todo.dueDate)) {
            todoElement.querySelector(".due-date").classList.add("overdue");
        }

        todoElement.querySelector(".due-date span").textContent = date;
    }

    if (todo.dueTime) {
        const time = new Intl.DateTimeFormat(navigator.language, {
            hour: "numeric",
            minute: "numeric",
        }).format(todo.dueDate);

        todoElement.querySelector(".due-date span:last-child").textContent = time;
    }
}

function createTodo(projectElement, todo, idx) {
    const div = document.createElement("div");
    div.innerHTML = todoHTML;
    projectElement.insertBefore(div.firstElementChild, projectElement.children[idx]);

    const todoElement = projectElement.children[idx];

    syncTodoWithTodoDOM(todoElement, todo);

    const checkBoxBtn = todoElement.querySelector(".checkbox-container");
    checkBoxBtn.addEventListener("click", !todo.completed ? completeTodo : uncompleteTodo);

    const updateBtn = todoElement.querySelector(".edit-todo");
    if (todo.completed) {
        updateBtn.classList.add("hide");
        updateBtn.disabled = true;
    }

    function completeTodo(e) {
        e.stopPropagation();
    
        const project = TodoList.projects.find((project) =>
            project.todos.indexOf(todo) !== -1 ||
            project.sections.find((section) => section.todos.indexOf(todo) !== -1)
        );
        todo.project.completeTodo(todo.project.todos.indexOf(todo));
        todoElement.classList.add("removed");
    
        if (isPast(todo.dueDate)) todayTodos.sections[0].deleteTodo(todo);
    
        function handleTransitionEnd() {
            domTodoCountMap.get(project).textContent = project.todosCount;
            domTodoCountMap.get(todayTodos).textContent = todayTodos.todosCount;
            
            if (todayTodos.sections[0].todosCount === 0) {
                domTodoCountMap.get(todayTodos).classList.remove("overdue");
            }

            if (curProjectIndex !== -1) {
                domCompletedProjectMap.get(todo.project).insertBefore(
                    todoElement,
                    domCompletedProjectMap.get(todo.project).children[todo.project.completedTodos.indexOf(todo)]
                );
            } else todoElement.remove();
            todoElement.classList.remove("removed");
      
      
            addRemoveCompleteClass(todo, todoElement);
      
            if (isToday(todo.dueDate)) {
                todayTodos.deleteTodo(todo);
                domTodoCountMap.get(todayTodos).textContent = todayTodos.todosCount;
            }
            todoElement.querySelector(".due-date").classList.remove("overdue");
            todoElement.removeEventListener("transitionend", handleTransitionEnd);
            updateBtn.classList.add("hide");
            updateBtn.disabled = true;
        }
    
        checkBoxBtn.removeEventListener("click", completeTodo);
        checkBoxBtn.addEventListener("click", uncompleteTodo);
        todoElement.addEventListener("transitionend", handleTransitionEnd);
        
        savedTodoLocalStorage();
    }

    function uncompleteTodo(e) {
        e.stopPropagation();
    
        const project = TodoList.projects.find((project) =>
            project.completedTodos.indexOf(todo) !== -1 ||
            project.sections.find((section) => section.completedTodos.indexOf(todo) !== -1)
        );
        todo.project.uncompleteTodo(todo.project.completedTodos.indexOf(todo));
    
        if (isPast(todo.dueDate)) todayTodos.sections[0].addTodo(todo);
        todoElement.classList.add("removed");
    
        function handleTransitionEnd() {
            domTodoCountMap.get(project).textContent = project.todosCount;
            domTodoCountMap.get(todayTodos).textContent = todayTodos.todosCount;
            
            if (todayTodos.sections[0].todosCount !== 0) {
                domTodoCountMap.get(todayTodos).classList.add("overdue");
            }

            domProjectMap.get(todo.project).insertBefore(
                todoElement,
                domProjectMap.get(todo.project).children[todo.project.todos.indexOf(todo)]
            );
            todoElement.classList.remove("removed");
      
            if (isToday(todo.dueDate)) {
                todayTodos.addTodo(todo);
                domTodoCountMap.get(todayTodos).textContent = todayTodos.todosCount;
            }
      
            if (isPast(todo.dueDate)) {
                todoElement.querySelector(".due-date").classList.add("overdue");
            }
      
            addRemoveCompleteClass(todo, todoElement);
            todoElement.removeEventListener("transitionend", handleTransitionEnd);
            updateBtn.classList.remove("hide");
            updateBtn.disabled = false;
        }
    
        checkBoxBtn.removeEventListener("click", uncompleteTodo);
        checkBoxBtn.addEventListener("click", completeTodo);
        todoElement.addEventListener("transitionend", handleTransitionEnd);
    
        savedTodoLocalStorage();
    }

    function deleteTodo() {
        const project = TodoList.projects.find((project) => {
            if (!todo.completed) {
                return (
                    project.todos.indexOf(todo) !== -1 ||
                    project.sections.find((section) => section.todos.indexOf(todo) !== -1)
                );
            } else {
                return (
                    project.completedTodos.indexOf(todo) !== -1 ||
                    project.sections.find((section) => section.completedTodos.indexOf(todo) !== -1)
                );
            }
        });

        if (!todo.completed) todo.project.deleteTodo(todo); 
        else todo.project.deleteCompletedTodo(todo);

        domTodoCountMap.get(project).textContent = project.todosCount;
        if (todo.dueDate && isToday(todo.dueDate)) {
            todayTodos.deleteTodo(todo);
            domTodoCountMap.get(todayTodos).textContent = todayTodos.todosCount;
        }
    
        savedTodoLocalStorage();
    
        todoElement.classList.add("removed");
        todoElement.addEventListener("transitionend", () => todoElement.remove());
        cancelDeleteBtn.click();
    }

    function cancelDeleteTodo() {
        deleteConfirmBtn.removeEventListener("click", deleteTodo);
        cancelDeleteBtn.removeEventListener("click", cancelDeleteTodo);
        deleteOverlay.style.display = "";
        deleteModal.remove();
    }

    const deleteBtn = todoElement.querySelector(".delete");
    deleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
    
        deleteOverlay.style.display = "block";
        deleteOverlay.appendChild(deleteModal);
        deleteObjectInfo.textContent = todo.title;
        deleteConfirmBtn.addEventListener("click", deleteTodo);
        cancelDeleteBtn.addEventListener("click", cancelDeleteTodo);
    });

    function updateTodo(e) {
        e.preventDefault();
    
        updateTodoForm.remove();

        const title = updateTodoTitle.textContent;
        const description = updateTodoDescription.textContent;
        const dueDate = updateTodoDate.nextElementSibling.value;
        const dueTime = updateTodoTime.nextElementSibling.value;
        const priority = updateTodoPriority.value;
        const [projectIdx, sectionIdx] = updateTodoProject.value.split("/");

        const oldProject_ = TodoList.projects.find((project) =>
            project.todos.indexOf(todo) !== -1 ||
            project.sections.find((section) => section.todos.indexOf(todo) !== -1)
        );
        const oldProject = todo.project;
        const oldDuedate = todo.dueDate;

        todo.title = title;
        todo.description = description;
        todo.dueDate = dueDate ? new Date(dueDate + " " + dueTime) : null;
        todo.dueTime = dueTime ? true : false;
        todo.priority = +priority;
        todo.project = sectionIdx ? TodoList.projects[+projectIdx].sections[+sectionIdx] : TodoList.projects[+projectIdx];

        const svg = todoElement.querySelector(".due-date svg");
        todoElement.querySelectorAll(".due-date span").forEach((span) => span.textContent = "");
        
        if (svg) svg.remove();
        if (todo.dueDate && !todo.dueTime) todo.dueDate = endOfDay(todo.dueDate);
    
        if (isPast(oldDuedate) && !isEqual(oldDuedate, todo.dueDate) && !isPast(todo.dueDate)) {
            todayTodos.sections[0].deleteTodo(todo);
            domTodoCountMap.get(todayTodos).textContent = todayTodos.todosCount;
            if (todayTodos.sections[0].todosCount === 0) {
                domTodoCountMap.get(todayTodos).classList.remove("overdue");
            }
        }
        if (
            todo.dueDate && 
            isToday(todo.dueDate) && 
            !isToday(oldDuedate)
        ) {
            todayTodos.addTodo(todo);
            domTodoCountMap.get(todayTodos).textContent = todayTodos.todosCount;
        }
        if (
            (isToday(oldDuedate) && 
            todo.dueDate && 
            !isToday(todo.dueDate)) ||
            !todo.dueDate
        ) {
            todayTodos.deleteTodo(todo);
            domTodoCountMap.get(todayTodos).textContent = todayTodos.todosCount;
        }
        if (
            isToday(oldDuedate) &&
            isToday(todo.dueDate) &&
            !isEqual(oldDuedate, todo.dueDate)
        ) {
            todayTodos.deleteTodo(todo);
            todayTodos.addTodo(todo);
        }

        if (curProjectIndex !== +projectIdx) {
            if (
                curProjectIndex !== -1 ||
                (curProjectIndex === -1 && !todo.dueDate) ||
                (todo.dueDate && !isToday(todo.dueDate))
            )
            todoElement.remove();
            oldProject.deleteTodo(todo);
            todo.project.addTodo(todo);
            domTodoCountMap.get(oldProject_).textContent = oldProject_.todosCount;
            domTodoCountMap.get(TodoList.projects[+projectIdx]).textContent = todo.project.todosCount;
            if (
                curProjectIndex === -1 &&
                !isEqual(oldDuedate, todo.dueDate) &&
                isToday(todo.dueDate)
            ) {
                if (isPast(oldDuedate)) {
                    domProjectMap.get(todayTodos).insertBefore(
                        todoElement,
                        domProjectMap.get(todayTodos).children[todayTodos.todos.indexOf(todo)]
                    );
                } else {
                    domProjectMap.get(todayTodos).insertBefore(
                        todoElement,
                        domProjectMap.get(todayTodos).children[todayTodos.todos.indexOf(todo)]
                    );
                }
            }
                
            removeDateTimeClasses(todoElement.querySelector(".due-date"));
            syncTodoWithTodoDOM(todoElement, todo);
        } else {
            if (oldProject !== todo.project) {
                oldProject.deleteTodo(todo);
                todo.project.addTodo(todo);
        
                const todoIdx = todo.project.todos.indexOf(todo);
                const domTodoContainer = domProjectMap.get(todo.project);

                domTodoContainer.insertBefore(todoElement, domTodoContainer.children[todoIdx]);
            } else {
                if (!isEqual(oldDuedate, todo.dueDate)) {
                    const oldIdx = todo.project.todos.indexOf(todo);
                    todo.project.deleteTodo(todo);
                    todo.project.addTodo(todo);
                    const newIdx = todo.project.todos.indexOf(todo);
                    todoElement.parentElement.insertBefore(
                        todoElement,
                        todoElement.parentElement.children[oldIdx <= newIdx ? newIdx + 1 : newIdx]
                    );
                }
            }
      
            removeDateTimeClasses(todoElement.querySelector(".due-date"));
            syncTodoWithTodoDOM(todoElement, todo);
        }
    
        savedTodoLocalStorage();
        cancelUpdateBtn.click();
    }

    function removeUpdateFormBinding() {
        todoElement.style.display = "";
        cancelUpdateBtn.removeEventListener("click", removeUpdateFormBinding);
        updateTodoForm.querySelector(".confirm-btn").removeEventListener("click", updateTodo);
        updateTodoForm.remove();
    }

    function bindUpdateFormTodo(e) {
        e.stopPropagation();
    
        inlineForm.querySelector(".cancel-btn").click();
        todoElement.parentElement.insertBefore(updateTodoForm, todoElement);
        updateTodoForm.style.display = "block";
    
        const event = new Event("input");

        updateTodoTitle.textContent = todo.title;
        updateTodoTitle.focus();
        updateTodoTitle.dispatchEvent(event);
        updateTodoDescription.textContent = todo.description;
        updateTodoDescription.dispatchEvent(event);
        updateTodoPriority.value = todo.priority;

        let todoProjectIdx, projectIdx;
        if (curProjectIndex !== -1) {
            todoProjectIdx = TodoList.projects[curProjectIndex].sections.indexOf(todo.project);
        } else {
            const project = TodoList.projects.find((project) =>
                project.todos.indexOf(todo) !== -1 ||
                project.sections.find((section) => section.todos.indexOf(todo) !== -1)
            );    
            
            projectIdx = TodoList.projects.indexOf(project).toString();
            todoProjectIdx = TodoList.projects[projectIdx].sections.indexOf(todo.project);
        }

        if (todoProjectIdx === -1) todoProjectIdx = "";
        else todoProjectIdx = todoProjectIdx.toString();

        if (curProjectIndex === -1) updateTodoProject.value = `${projectIdx}/${todoProjectIdx}`;
        else updateTodoProject.value = `${curProjectIndex}/${todoProjectIdx}`;
        
        if (todo.dueDate) {
            updateTodoDate.nextElementSibling.value = `${todo.dueDate.getFullYear()}-${(todo.dueDate.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${todo.dueDate
            .getDate()
            .toString()
            .padStart(2, "0")}`;
            updateTodoDate.nextElementSibling.dispatchEvent(new Event("input"));

            if (todo.dueTime) {
                updateTodoTime.nextElementSibling.value = `${todo.dueDate
                .getHours()
                .toString()
                .padStart(2, "0")}:${todo.dueDate
                .getMinutes()
                .toString()
                .padStart(2, "0")}`;
                updateTodoTime.nextElementSibling.dispatchEvent(new Event("input"));
            }

            addDateTimeClasses(updateTodoDate);
        }

        cancelUpdateBtn.addEventListener("click", removeUpdateFormBinding);
        updateTodoForm.querySelector(".confirm-btn").addEventListener("click", updateTodo);
        todoElement.style.display = "none";
    }
        
    updateBtn.addEventListener("click", bindUpdateFormTodo);

    function showDialog() {
        const dialog = document.querySelector("dialog");
        dialog.querySelector(".todo-title-big").textContent = todo.title;
        dialog.querySelector(".todo-desc-big").textContent = todo.description;

        const project = TodoList.projects.find((project) =>
            project.todos.indexOf(todo) !== -1 ||
            project.sections.find((section) => section.todos.indexOf(todo) !== -1)
        ) || TodoList.projects.find((project) =>
            project.completedTodos.indexOf(todo) !== -1 ||
            project.sections.find((section) => section.completedTodos.indexOf(todo) !== -1)
        );

        if (project === todo.project) dialog.querySelector(".todo-project-big").textContent = todo.project.name;
        else dialog.querySelector(".todo-project-big").textContent = `${project.name}/${todo.project.name}`;
        
        const dateElement = dialog.querySelector(".todo-display-date");
        dateElement.textContent = "No due date";
        dialog.querySelector(".todo-display-time").textContent = "";
        removeDateTimeClasses(dateElement.parentElement);
    
        if (todo.dueDate) {
            const today = new Date();
            const nextWeek = endOfDay(addDays(today, 7));
      
            if (isToday(todo.dueDate)) {
                dateElement.textContent = "Today";
                dateElement.parentElement.classList.add("today");
            } else if (isTomorrow(todo.dueDate)) {
                dateElement.textContent = "Tomorrow";
                dateElement.parentElement.classList.add("tomorrow");
            } else if (
                isWithinInterval(todo.dueDate, { start: today, end: nextWeek })
            ) {
                dateElement.textContent = format(todo.dueDate, "EEEE");
                dateElement.parentElement.classList.add("this-week");
            } else {
                dateElement.textContent = format(todo.dueDate, "d MMM");
            }
      
            if (isPast(todo.dueDate)) {
                dateElement.parentElement.classList.add("overdue");
            }
      
            if (todo.dueTime) {
                const time = new Intl.DateTimeFormat(navigator.language, {
                    hour: "numeric",
                    minute: "numeric",
                }).format(todo.dueDate);

                dialog.querySelector(".todo-display-time").textContent = time;
            }
        }
    
        const priority = dialog.querySelector(".todo-display-priority");
        priority.parentElement.classList.remove("checkbox-p1", "checkbox-p2", "checkbox-p3");
        priority.textContent = `Priority ${todo.priority}`;
        priority.parentElement.classList.add(`checkbox-p${todo.priority}`);
        
        dialog.querySelector(".checkbox").classList.remove("completed", "checkbox-p1", "checkbox-p2", "checkbox-p3");
        dialog.querySelector(".checkbox").classList.add(`checkbox-p${todo.priority}`);
    
        if (todo.completed) {
            dialog.querySelector(".checkbox").classList.add("completed");
        }
        dialog.showModal();
    }
    
    todoElement.addEventListener("click", showDialog);
}

window.addEventListener('load', () => {
    populateProjectSelectorOptions();
    renderProject(TodoList.projects[0]);
});
 
function closeFormOnEscape(e) {
    if (e.key === "Escape") e.currentTarget.querySelector(".cancel-btn").click();
    else if (e.key === "Enter") e.currentTarget.querySelector(".confirm-btn").click();
}

inlineForm.addEventListener("keydown", closeFormOnEscape);
updateTodoForm.addEventListener("keydown", closeFormOnEscape);

const sectionNameInput = addSectionForm.querySelector('input[name="section-name"]');
sectionNameInput.addEventListener("input", (e) => {
    if (sectionNameInput.value) addSectionForm.querySelector(".add-section-confirm").disabled = false;
    else addSectionForm.querySelector(".add-section-confirm").disabled = true;
});

const leftMenu = document.querySelector("#sidebar > ul:first-of-type");
leftMenu.addEventListener("click", (e) => {
    e.preventDefault();
    
    let clicked = e.target.closest("li");
    if (!clicked) return;
    
    domProjectLinkMap.forEach((link) => link.classList.remove("active"));

    clicked.classList.add("active");
    if (clicked.id === "inbox") {
        if (curProjectIndex !== 0) {
            projectOption.style.display = "";
            renderProject(TodoList.projects[0]);
        }
    } else if (clicked.id === "today") {
        if (curProjectIndex !== -1) {
            projectOption.style.display = "none";
            renderProject(todayTodos);
            main.firstElementChild.firstElementChild.textContent = "Today";
        }
    } 
});

addProjectBtn.addEventListener("click", () => {
    addProjectForm.style.display = "flex";
    projectContainer.append(addProjectForm);
    addProjectForm.querySelector("input").focus();
});

const projectNameInput = addProjectForm.querySelector("input");
const addProjectConfirm = addProjectForm.querySelector(".add-project-confirm");

projectNameInput.addEventListener("input", (e) => {
    if (projectNameInput.value) addProjectConfirm.disabled = false;
    else addProjectConfirm.disabled = true;
});

function renderProject(project) {
    main.firstElementChild.firstElementChild.textContent = project.name;
    sectionsList.innerHTML = "";
    curProjectIndex = TodoList.projects.indexOf(project);
    curProject = project.name;
    
    domProjectMap.clear();
    domCompletedProjectMap.clear();
    
    createSectionDOM("", 0, project);
    project.sections.forEach((section, idx) => createSectionDOM(section.name, idx + 1, section));
}

function createProjectDOM(project) {
    const div = document.createElement("div");
    div.insertAdjacentHTML("afterbegin", projectHTML);
    const projectEl = div.firstElementChild;
    
    domProjectLinkMap.set(project, projectEl);
    projectEl.querySelector(".project-name").textContent = project.name;
    
    domTodoCountMap.set(project, projectEl.querySelector(".project-todo-count span"));
    projectEl.querySelector(".project-todo-count span").textContent = project.todosCount;
    
    projectContainer.append(projectEl);
    projectEl.addEventListener("click", (e) => {
        e.preventDefault();
    
        domProjectLinkMap.forEach((el) => el.classList.remove("active"));
        projectEl.classList.add("active");
    
        renderProject(project);
        projectOption.style.display = "";
    });
}

addProjectConfirm.addEventListener("click", (e) => {
    e.preventDefault();
  
    const projectName = projectNameInput.value;
    if (!projectName) return;
  
    const project = new Project(projectName);
    TodoList.addProject(project);
  
    populateProjectSelectorOptions();

    savedTodoLocalStorage();
  
    createProjectDOM(project);
    addProjectConfirm.form.style.display = "none";
    addProjectConfirm.form.remove();
    addProjectConfirm.disabled = true;
    projectNameInput.value = "";
});

const cancelAddProject = addProjectForm.querySelector(".add-project-cancel");
cancelAddProject.addEventListener("click", (e) => {
    e.preventDefault();
  
    cancelAddProject.previousElementSibling.disabled = true;
    cancelAddProject.form.style.display = "none";
    projectNameInput.value = "";
});

projectNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cancelAddProject.click();
});

const projectOptionContainer = document.querySelector(".project-option-container");
projectOption.addEventListener("click", (e) => {
    projectOption.firstElementChild.classList.add("hide");
    
    if (curProjectIndex !== 0) projectOptionContainer.lastElementChild.classList.remove("hide");
    projectOptionContainer.firstElementChild.classList.remove("hide");
});
  
document.addEventListener("click", (e) => {
    if (
        !projectOptionContainer.contains(e.target) &&
        !projectOption.contains(e.target)
    ) closeProjectOptions();
    
    const closest = e.target.closest(".todo-more-options:not(.project-option)");
    if (!closest) {
        document.querySelectorAll(".section .todo-more-options").forEach((el) => {
            el.firstElementChild.classList.remove("hide");
            el.lastElementChild.classList.add("hide");
        });
    }
});

function closeProjectOptions() {
    projectOptionContainer.firstElementChild.classList.add("hide");
    projectOptionContainer.lastElementChild.classList.add("hide");
    projectOption.firstElementChild.classList.remove("hide");
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeProjectOptions();

        document.querySelectorAll(".section .todo-more-options").forEach((el) => {
            el.firstElementChild.classList.remove("hide");
            el.lastElementChild.classList.add("hide");
        });
        if (!modalFormOverlay.classList.contains("hide")) {
            modalForm.querySelector(".cancel-btn").click();
        }
    }
});

let completedShown = false;
const toggleCompleted = document.querySelector(".toggle-completed");
const deleteProject = document.querySelector(".delete-project");
toggleCompleted.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    closeProjectOptions();
    
    completedShown = !completedShown;
    if (!completedShown) {
        projectOptionContainer.firstElementChild.lastElementChild.textContent = "Show completed";
    } else {
        projectOptionContainer.firstElementChild.lastElementChild.textContent = "Hide completed";
    }

    sectionsList.querySelectorAll(".completed-tasks-list").forEach((tasksList) => tasksList.classList.toggle("hide"));
});

function deleteProjectHandler(e) {
    e.preventDefault();
  
    if (curProjectIndex === 0) return;
  
    const projectToDelete = TodoList.projects[curProjectIndex];
    domProjectLinkMap.get(projectToDelete).remove();
    domProjectLinkMap.delete(projectToDelete);
    domTodoCountMap.delete(projectToDelete);
    TodoList.removeProject(curProjectIndex);

    populateProjectSelectorOptions();
    
    function fixTodayTodos(todo) {
        if (isToday(todo.dueDate)) todayTodos.deleteTodo(todo);
        if (isPast(todo.dueDate)) todayTodos.sections[0].deleteTodo(todo);
    }
    
    projectToDelete.todos.forEach(fixTodayTodos);
    projectToDelete.sections.forEach((section) => section.todos.forEach(fixTodayTodos));
  
    if (todayTodos.sections[0].todosCount === 0) {
        domTodoCountMap.get(todayTodos).classList.remove("overdue");
    }
    
    domTodoCountMap.get(todayTodos).textContent = todayTodos.todosCount;
    curProjectIndex = 0;
    curProject = "Inbox";
    renderProject(TodoList.projects[0]);
    projectOption.style.display = "";
  
    savedTodoLocalStorage();
    cancelDeleteBtn.click();
}

function cancelProjectDelete(e) {
    e.preventDefault();
  
    deleteOverlay.style.display = "none";
    deleteModal.remove();
    deleteConfirmBtn.removeEventListener("click", deleteProjectHandler);
    cancelDeleteBtn.removeEventListener("click", cancelProjectDelete);
}
    
deleteProject.addEventListener("click", (e) => {
    e.preventDefault();

    deleteOverlay.style.display = "block";
    deleteOverlay.appendChild(deleteModal);
    deleteObjectInfo.textContent = `${TodoList.projects[curProjectIndex].name} with ${TodoList.projects[curProjectIndex].todosCount} tasks`;
    deleteConfirmBtn.addEventListener("click", deleteProjectHandler);
    cancelDeleteBtn.addEventListener("click", cancelProjectDelete);
});

const toggleSidebar = document.querySelector(".toggle-sidebar");
const sidebar = document.getElementById('sidebar');
toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
    main.classList.toggle('full');
    toggleSidebar.classList.toggle('hidden');
});

const openModalFormBtn = document.querySelector(".open-modal-form-btn");
const modalFormOverlay = document.querySelector(".modal-form-container");
modalForm.querySelector(".cancel-btn").addEventListener('click', () => {
    modalFormOverlay.classList.add('hide');
    modalForm.style.display = '';
});
openModalFormBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
  
    modalFormOverlay.classList.remove('hide');
    modalForm.querySelector(".todo-title-input").focus();
});
modalFormOverlay.addEventListener('click', (e) => {
    if (e.target === modalFormOverlay) {
        modalForm.querySelector(".cancel-btn").click();
    }
});

const collapseProjectsBtn = document.querySelector(".collapse-projects");
const projectsList = document.querySelector(".projects-list");
collapseProjectsBtn.addEventListener('click', () => {
    collapseProjectsBtn.classList.toggle('collapsed');
    projectsList.classList.toggle('hide');
});