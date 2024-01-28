// Initial variables
let thread_json = {} // Make thread JSON a global variable

// Add event listeners
show_toc.addEventListener('click', toggleTOC)
toc.querySelector("span:first-child").addEventListener('click', jumpToPost)
button_view_file.addEventListener('change', handleSubmit)
label_view_file.addEventListener('drop', dropSubmit)
label_view_file.addEventListener('dragover', dragOverHandler)
parent_revisions.addEventListener('input', changeRevision)

function toggleTOC() {
    toc_container.classList.toggle("on")
}

function jumpToPost(event) {
    let jumped = document.querySelector(`[data-comment-id="${event.target.dataset["commentJump"]}"]`)
    jumped.classList.remove("flash")
    jumped.querySelector("#parent_top, .comment_top").scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    })
    jumped.classList.add("flash")
}

// Prevent file from being opened in browser itself
function dragOverHandler(event) {event.preventDefault() }

    /*
Lifesaving JSON file loader:
https://gomakethings.com/how-to-upload-and-process-a-json-file-with-vanilla-js/
(I modified it here so that it would immediately do s**t upon upload)
    */
function fileReader(file) {
    let reader = new FileReader()
    reader.onload = (event) => {
        let object = event.target.result
        thread_json = JSON.parse(object)
        compileThread(thread_json) // Thread compiler
    }
    reader.readAsText(file)
}

function handleSubmit(event) { // event.target is the button
    event.preventDefault() // Do not open file like default
    if (!event.target.value.length) return // If no files submitted when interface closed
    fileReader(event.target.files[0])
}

function dropSubmit(event) {
    event.preventDefault() // Do not open file like default

    if (event.dataTransfer.items) { // If other items are present in dragging
        fileList = [...event.dataTransfer.items]
        for (let i = 0; i < fileList.length; i++) {
            if (fileList[i].kind === "file") {
                fileReader([...event.dataTransfer.files][i])
                break // Only get first file
            }
        }
    } else { 
        fileReader([...event.dataTransfer.files][0]) // Only get first file
    }
}

// Thread compiler, function only runs when file is submitted
function compileThread(object) {
    // Entire-thread-specific stuff

    // Breadcrumbs
    document.querySelector("#page_breadcrumbs").classList.remove("hide")
    document.querySelector("#breadcrumb_wiki").textContent = object.wiki
    document.querySelector("#breadcrumb_board").textContent = object.forumBoard
    document.querySelector("#breadcrumb_thread").textContent = object.threadName
    
    // Remove old comments
    let old_comments = page_body.querySelectorAll(".comment")
    if (old_comments.length) {
        for (let com = 0; com < old_comments.length; com++) {
            old_comments[com].remove()
        }
    }
    toc.querySelector("ol").innerHTML = ""

    for (let i in object.messages) {
        let message = object.messages[i]

        if (i == 0) { // Parent comment
            // Remove old revision entries
            let old_revisions = parent_revisions.querySelectorAll(":not([disabled])")
            if (old_revisions.length > 0) {
                for (let com = 0; com < old_revisions.length; com++) {
                    old_revisions[com].remove()
                }
            }

            postCreator(message, false)
            document.title = "JSONterpreter | " + parent_title.textContent
            continue
        }
        postCreator(message, true, Number(i)+1)
    }
}

function findUser(userlist, id) {
    if (id.includes(".")) return userlist.find(user => user.username == id) // IP adresses
    if (!userlist.find(user => user.userid == id)) return {
        avatar: "",
        userid: 0,
        username: ".." // Nothing found
    }
    return userlist.find(user => user.userid == id) // User IDs
}

function readableDate(string) {
    // 2015-03-12T21:20:16Z
    let year   = string.substring( 0, 4)
    let month  = string.substring( 5, 7)
    let day    = string.substring( 8,10)
    let hour   = string.substring(11,13)
    let minute = string.substring(14,16)
    let second = string.substring(17,19)

    let monthlist = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ]

    return `${year} ${monthlist[month-1]} ${day}, ${hour}:${minute}:${second}`
}

function addRevisionOption(select, revid, timeEdited) {
    let dateEdited = readableDate(timeEdited)

    let revision_object = document.createElement("option")
    revision_object.value = revid
    revision_object.textContent = `${revid}, ${dateEdited}`

    select.add(revision_object)
}

function creatorInit(message) {
    // If poster is missing due to name change, fall back to the first revisor of the post
    let poster = findUser(thread_json.users, message.poster)
    if (poster.username == "..") poster = findUser(thread_json.users, message.revisions.at(-1).editor)

    let homeless_revision = message.revisions.find(rev => !rev.text.toUpperCase().includes("HOUSEKEEP"))
    if (homeless_revision == undefined) homeless_revision = revision[0]
    
    let editor = findUser(thread_json.users, homeless_revision.editor)
    return [poster, homeless_revision, editor]
}

function postCreator(message, isComment, comment_id) {
    let q = +isComment // 0 or 1; 0 for thread, 1 for comment
    let [poster, homeless_revision, editor] = creatorInit(message)

    // parent assigned to comment just so I don't have to deal with undefined errors
    let Co = isComment ? template_comment.content.cloneNode(true) : parent_contain
    // Post part shorthand
    let Post = {
        poster:      [parent_poster     , Co.querySelector(".comment_poster")     ],
        kudos_count: [parent_kudos_count, Co.querySelector(".comment_kudos_count")],
        time:        [parent_time       , Co.querySelector(".comment_time")       ],
        bottom:      [parent_bottom     , Co.querySelector(".comment_bottom")     ],
        edited:      [parent_edited     , Co.querySelector(".comment_edited")     ],
        edit_time:   [parent_edit_time  , Co.querySelector(".comment_edit_time")  ],
        content:     [parent_content    , Co.querySelector(".comment_content")    ],
        revisions:   [parent_revisions  , Co.querySelector(".comment_revisions")  ],
    }

    // Set username, kudos count, and timestamp
    Post.poster[q].textContent = poster.username
    Post.kudos_count[q].textContent = message.kudos
    Post.time[q].textContent = readableDate(message.timePosted)
    
    // If multiple revisions, show who is the revisor of current revision
    if (message.revisions.length > 1) {
        Post.bottom[q].classList.remove("hide")
        Post.edited[q].textContent = editor.username
        Post.edit_time[q].textContent = readableDate(homeless_revision.timeEdited)
    } else {
        Post.bottom[q].classList.add("hide")
    }
    
    // Prepare parent title and empty content HTML
    if (!isComment) {
        parent_title.textContent = homeless_revision.threadName ? homeless_revision.threadName : "Missing parent"
        // q == 0
        Post.content[q].innerHTML = ""
    }
    // Regex primarily for parents - "AC_MeTaData REgex"
    let ac_mtd_re = /(&lt;ac_metadata.*&lt;\/ac_metadata&gt;)/gm
    // and THEN fill the content HTML
    Post.content[q].insertAdjacentHTML('beforeend', homeless_revision.text.replace(ac_mtd_re,""))
    
    // First -if- primarily for parents - Prepare revisions
    if (homeless_revision.text != "Missing parent") for (let j in message.revisions) {
        let revision = message.revisions[j]
        addRevisionOption(Post.revisions[q], revision.revid, revision.timeEdited)
    }
    
    // If comment, add ID, revision changer (parent already has it), and add comment to thread
    if (isComment){
        Co.querySelector(".comment").dataset["commentId"] = comment_id
        // q == 1
        Post.revisions[q].addEventListener('input', changeRevision)
        page_body.appendChild(Co)
    }

    addTOC(poster.username, Post.content[q].innerText, comment_id)
}

function addTOC(username, text, id) {
    let toc_entry = template_toc.content.cloneNode(true)
    let Entry = {
        one: toc_entry.querySelector("span:first-child"),
        two: toc_entry.querySelector("span:last-child")
    }

    Entry.one.innerText = username
    Entry.two.innerText = text.replaceAll("\n", " ").substring(0,20) + (text.length > 20 ? "..." : "")
    Entry.one.dataset['commentJump'] = id ? id : 1

    Entry.one.addEventListener('click', jumpToPost)
    toc.querySelector("ol").appendChild(toc_entry)
}

function changeRevision(event) {
    // targ-et com-ment
    let targcom = event.target.parentElement.parentElement

    let comment_id = targcom.dataset["commentId"]
    let revision_id = event.target.value

    let revision = thread_json.messages[comment_id-1].revisions.find(rev => rev.revid == revision_id)
    let comment_content = targcom.querySelector("#parent_content, .comment_content")
    comment_content.innerHTML = ""
    comment_content.insertAdjacentHTML('beforeend', revision.text.replace(/(&lt;ac_metadata.*&lt;\/ac_metadata&gt;)/gm,""))

    if (comment_id == 1) {
        parent_title.textContent = revision.threadName
    }

    targcom.querySelector("#parent_edited, .comment_edited").textContent = findUser(thread_json.users, revision.editor).username
    targcom.querySelector("#parent_edit_time, .comment_edit_time").textContent = readableDate(revision.timeEdited)
    document.title = "JSONterpreter | " + parent_title.textContent
}
