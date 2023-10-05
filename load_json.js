// Initial variables
let thread_json = {} // Make thread JSON a global variable

// Add event listener to "View file"
button_view_file.addEventListener('change', handleSubmit)
thread_parent_revisions.addEventListener('input', changeRevision)

/** 
 * Lifesaving JSON file loader:
 * https://gomakethings.com/how-to-upload-and-process-a-json-file-with-vanilla-js/
 * (I modified it here so that it would immediately do s**t upon upload)
**/
function handleSubmit(event) { // event.target is the button
    event.preventDefault()
    if (!event.target.value.length) return

    var reader = new FileReader()
    reader.onload = (event) => {
        object = event.target.result
        thread_json = JSON.parse(object)
        compileThread(thread_json) // Thread compiler
    }
    reader.readAsText(event.target.files[0])
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
    let old_comments = page_body.querySelectorAll(".thread_comment")
    if (old_comments.length > 0) {
        for (let com = 0; com < old_comments.length; com++) {
            old_comments[com].remove()
        }
    }

    for (let i in object.messages) {
        let message = object.messages[i]

        if (i == 0) { // Parent comment
            // Remove old revision entries
            let old_revisions = thread_parent_revisions.querySelectorAll(":not([disabled])")
            if (old_revisions.length > 0) {
                for (let com = 0; com < old_revisions.length; com++) {
                    old_revisions[com].remove()
                }
            }

            parentCreator(message)
            continue
        }
        commentCreator(message, Number(i)+1)
    }
}

function findUser(userlist, id) {
    if (id.includes(".")) return userlist.find(user => user.username == id) // IP adresses
    if (!userlist.find(user => user.userid == id)) return {
        avatar: "",
        userid: 0,
        username: "Missing username (for some reason???)"
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

function parentCreator(message) {
    let poster = findUser(thread_json.users, message.poster)

    let homeless_revision = message.revisions.find(rev => !rev.text.toUpperCase().includes("HOUSEKEEP"))
    if (homeless_revision == undefined) homeless_revision = revision[0]

    let editor = findUser(thread_json.users, homeless_revision.editor)

    thread_parent_poster.textContent = poster.username
    thread_parent_kudos_count.textContent = message.kudos
    thread_parent_time.textContent = readableDate(message.timePosted)

    if (message.revisions.length > 1) {
        thread_parent_bottom.classList.remove("hide")

        thread_parent_edited.textContent = editor.username
        thread_parent_edit_time.textContent = readableDate(homeless_revision.timeEdited)
    } else {
        thread_parent_bottom.classList.add("hide")
    }

    thread_parent_title.textContent = homeless_revision.threadName
    thread_parent_content.innerHTML = ""
    thread_parent_content.insertAdjacentHTML('beforeend', homeless_revision.text.replace(/(&lt;ac_metadata.*&lt;\/ac_metadata&gt;)/gm,""))

    if (homeless_revision.text != "Missing parent") for (let j in message.revisions) {
        let revision = message.revisions[j]
        addRevisionOption(thread_parent_revisions, revision.revid, revision.timeEdited)
    }
}

function commentCreator(message, comment_id) {
    let poster = findUser(thread_json.users, message.poster)

    let homeless_revision = message.revisions.find(rev => !rev.text.toUpperCase().includes("HOUSEKEEP"))
    if (homeless_revision == undefined) homeless_revision = revision[0]
    
    let editor = findUser(thread_json.users, homeless_revision.editor)

    const comment = template_thread_comment.content.cloneNode(true)

    comment.querySelector(".thread_comment").dataset.commentId = comment_id

    comment.querySelector(".thread_comment_poster").textContent = poster.username
    comment.querySelector(".thread_comment_kudos_count").textContent = message.kudos
    comment.querySelector(".thread_comment_time").textContent = readableDate(message.timePosted)

    if (message.revisions.length > 1) {
        comment.querySelector(".thread_comment_bottom").classList.remove("hide")

        comment.querySelector(".thread_comment_edited").textContent = editor.username
        comment.querySelector(".thread_comment_edit_time").textContent = readableDate(homeless_revision.timeEdited)
    }

    comment.querySelector(".thread_comment_content").insertAdjacentHTML('beforeend', homeless_revision.text)

    for (let j in message.revisions) {
        let revision = message.revisions[j]
        addRevisionOption(comment.querySelector(".thread_comment_revisions"), revision.revid, revision.timeEdited)
    }

    comment.querySelector(".thread_comment_revisions").addEventListener('input', changeRevision)

    page_body.appendChild(comment)
}

function changeRevision(event) {
    // targ-et com-ment
    let targcom = event.target.parentElement.parentElement

    let comment_id = targcom.dataset.commentId
    let revision_id = event.target.value

    let revision = thread_json.messages[comment_id-1].revisions.find(rev => rev.revid == revision_id)
    let comment_content = targcom.querySelector("#thread_parent_content, .thread_comment_content")
    comment_content.innerHTML = ""
    comment_content.insertAdjacentHTML('beforeend', revision.text.replace(/(&lt;ac_metadata.*&lt;\/ac_metadata&gt;)/gm,""))

    if (comment_id == 1) {
        thread_parent_title.textContent = revision.threadName
    }

    targcom.querySelector("#thread_parent_edited, .thread_comment_edited").textContent = findUser(thread_json.users, revision.editor).username
    targcom.querySelector("#thread_parent_edit_time, .thread_comment_edit_time").textContent = readableDate(revision.timeEdited)
}