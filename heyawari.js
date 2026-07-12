// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyDfMGBuQYpuyOMGt_hEdPgR_z42d92E8Lo",
    authDomain: "heyagae-84.firebaseapp.com",
    databaseURL: "https://heyagae-84-default-rtdb.firebaseio.com",
    projectId: "heyagae-84",
    storageBucket: "heyagae-84.firebasestorage.app",
    messagingSenderId: "199911902929",
    appId: "1:199911902929:web:447aa228c15e4b80b7bff0",
    measurementId: "G-BCG3FMW3KS"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const kanjiStorageKey = "heyawari_kanji_group_id";
const historyStorageKey = "heyawari_kanji_history_list";

let uniqueGroupId = "";
let groupDisplayName = "";
let currentFullMemberObjects = []; 
let cachedRoomsSetup = [];
let historyMatrix = {};
let unsubscribeMembers = null;
let unsubscribeStatus = null;
let isFirstDescriptionLoad = true;

window.onload = function() {
    renderHistoryList();
    const savedGroupId = localStorage.getItem(kanjiStorageKey);
    if (savedGroupId) { uniqueGroupId = savedGroupId; resumeGroupSession(); }
};

function renderHistoryList() {
    const historyData = localStorage.getItem(historyStorageKey);
    const historyList = historyData ? JSON.parse(historyData) : [];
    const container = document.getElementById('historyContainer');
    const area = document.getElementById('historyListArea');
    
    if (historyList.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    let html = "";
    historyList.forEach(item => {
        html += `
            <div class="history-item">
                <div class="history-link" onclick="loadFromHistory('${item.id}')">
                    🎤 ${item.title}
                    <span class="history-code">コード: ${item.id}</span>
                </div>
                <button class="btn-danger-sm" style="padding: 4px 6px; font-size:10px;" onclick="removeFromHistoryList('${item.id}', event)">❌</button>
            </div>
        `;
    });
    area.innerHTML = html;
}

function saveToHistoryList(id, title) {
    if (!id || !title) return;
    const historyData = localStorage.getItem(historyStorageKey);
    let historyList = historyData ? JSON.parse(historyData) : [];
    
    historyList = historyList.filter(item => item.id !== id);
    historyList.unshift({ id: id, title: title });
    
    localStorage.setItem(historyStorageKey, JSON.stringify(historyList));
    renderHistoryList();
}

function removeFromHistoryList(id, event) {
    event.stopPropagation();
    if (!confirm("このイベントを履歴から削除しますか？\n（Firebase上のデータは削除されません）")) return;
    
    const historyData = localStorage.getItem(historyStorageKey);
    if (!historyData) return;
    let historyList = JSON.parse(historyData);
    historyList = historyList.filter(item => item.id !== id);
    
    localStorage.setItem(historyStorageKey, JSON.stringify(historyList));
    renderHistoryList();
    
    if (uniqueGroupId === id) {
        clearKanjiState();
    }
}

function loadFromHistory(id) {
    uniqueGroupId = id;
    localStorage.setItem(kanjiStorageKey, uniqueGroupId);
    isFirstDescriptionLoad = true;
    resumeGroupSession();
}

function exitToMainMenu() {
    if (unsubscribeMembers) unsubscribeMembers();
    if (unsubscribeStatus) unsubscribeStatus();
    localStorage.removeItem(kanjiStorageKey);
    uniqueGroupId = "";
    document.getElementById('roomsSetupContainer').innerHTML = "";
    document.getElementById('resultInside').innerHTML = '';
    document.getElementById('step2_mainDashboard').style.display = 'none';
    document.getElementById('step1_connection').style.display = 'block';
    renderHistoryList();
}

function toggleDescriptionArea() {
    const container = document.getElementById('descriptionCardContainer');
    container.style.display = (container.style.display === 'none') ? 'block' : 'none';
}

function applyTemplate(type) {
    const textarea = document.getElementById('eventDescriptionInput');
    
    if (type === 'clear') {
        if(confirm("入力内容をクリアしますか？")) textarea.value = "";
        return;
    }

    if (textarea.value.trim() !== "") {
        if (!confirm("現在入力されている内容が上書きされますが、よろしいですか？")) return;
    }

    if (type === 'karaoke') {
        textarea.value = `【日時】 月 日()  : 〜 : \n【場所】店\n【会費】円（ドリンクバー込み）\n【締め切り】 月 日まで\n【備考・コメント】\n途中退室される方は幹事までご連絡ください。`;
    } else if (type === 'nijikai') {
        textarea.value = `【日時】 月 日()  : ~\n【場所】\n【会費】\n【締め秒読み】 月 日中まで\n【備考・コメント】\n遅刻しそうな場合は一言書き込みをお願いします！`;
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    if(window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
    document.getElementById(tabId).classList.add('active');
}

function handleRoomNameBlur(input) {
    let val = input.value.trim();
    if (!val) return;
    let normalized = val.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    if (/^\d+$/.test(normalized) && !val.endsWith("号室")) { input.value = val + "号室"; }
}

function addRoomRowSetup(roomId="", name="", cap=5, model="", memo="") {
    const container = document.getElementById('roomsSetupContainer');
    if(!roomId) {
        roomId = "room_" + (Date.now() + Math.floor(Math.random() * 1000));
    }
    const currentCount = container.children.length + 1;

    const div = document.createElement('div');
    div.className = 'room-row';
    div.setAttribute('data-room-id', roomId);
    div.innerHTML = `
        <div style="font-size:11px; color:#666; font-weight:bold; margin-bottom:4px;">部屋通し番号: No.${currentCount}</div>
        <div class="room-grid">
            <div><label>部屋番号/名:</label><input type="text" class="setup-room-name" value="${name}" placeholder="例: 101" onblur="handleRoomNameBlur(this)" style="width:100%; padding:6px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;"></div>
            <div><label>キャパ(定員):</label><input type="text" inputmode="numeric" list="capacityOptions" class="setup-room-cap" value="${cap}" style="width:100%; padding:6px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;"></div>
        </div>
        <div class="room-grid">
            <div><label>機種:</label><input type="text" list="modelOptions" class="setup-room-model" value="${model}" style="width:100%; padding:6px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;"></div>
            <div><label>その他メモ:</label><input type="text" list="memoOptions" class="setup-room-memo" value="${memo}" style="width:100%; padding:6px; border-radius:4px; border:1px solid #ccc; box-sizing:border-box;"></div>
        </div>
        <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger); position:absolute; right:8px; top:8px; padding:2px 6px;" onclick="this.parentElement.remove()">削除</button>
    `;
    container.appendChild(div);
}

function createNewGroupSession() {
    groupDisplayName = document.getElementById('groupNameInput').value.trim();
    if (!groupDisplayName) { alert("イベント名を入力してください"); return; }
    uniqueGroupId = encodeURIComponent(groupDisplayName).replace(/%/g, '') + "_" + Date.now();

    const initialRoomId = "room_" + Date.now();
    db.collection("multigroups").doc(uniqueGroupId).set({
        title: groupDisplayName,
        description: "", 
        roomsSetup: [{ id: initialRoomId, name: "101号室", capacity: 5, model: "DAM", memo: "", members: [] }],
        currentResult: null, status: "active", createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => { 
        localStorage.setItem(kanjiStorageKey, uniqueGroupId); 
        saveToHistoryList(uniqueGroupId, groupDisplayName);
        isFirstDescriptionLoad = true; 
        resumeGroupSession(); 
    });
}

function joinExistingGroupSession() {
    const inputCode = document.getElementById('existingCodeInput').value.trim();
    if (!inputCode) return;
    db.collection("multigroups").doc(inputCode).get().then(doc => {
        if (doc.exists && doc.data().status !== "reset") {
            uniqueGroupId = inputCode; 
            localStorage.setItem(kanjiStorageKey, uniqueGroupId); 
            saveToHistoryList(uniqueGroupId, doc.data().title);
            isFirstDescriptionLoad = true; 
            resumeGroupSession();
        } else { alert("有効なコードが見つかりません。"); }
    });
}

function resumeGroupSession() {
    document.getElementById('displayCodeText').innerText = uniqueGroupId;

    if (unsubscribeStatus) unsubscribeStatus();
    unsubscribeStatus = db.collection("multigroups").doc(uniqueGroupId).onSnapshot(doc => {
        if (!doc.exists || doc.data().status === "reset") { clearKanjiState(); return; }
        const data = doc.data();
        groupDisplayName = data.title;
        cachedRoomsSetup = data.roomsSetup || [];
        document.getElementById('step1_connection').style.display = 'none';
        document.getElementById('step2_mainDashboard').style.display = 'block';
        document.getElementById('activeGroupName').innerText = groupDisplayName;
        
        saveToHistoryList(uniqueGroupId, groupDisplayName);

        if (isFirstDescriptionLoad) {
            document.getElementById('eventDescriptionInput').value = data.description || "";
            isFirstDescriptionLoad = false;
        }

        const container = document.getElementById('roomsSetupContainer');
        if (container.children.length === 0) {
            cachedRoomsSetup.forEach(r => addRoomRowSetup(r.id, r.name, r.capacity, r.model, r.memo));
        }
        syncAndRenderRooms(data.currentResult);
        
        // 🛠️ 「heyawari.html」からのURL置換で「heyawari_user.html」へのURLを作成
        document.getElementById('shareUrl').value = window.location.href.replace('heyawari.html', 'heyawari_user.html') + `?groupId=${uniqueGroupId}`;
    });

    if (unsubscribeMembers) unsubscribeMembers();
    unsubscribeMembers = db.collection("multigroups").doc(uniqueGroupId).collection("members").onSnapshot(snapshot => {
        currentFullMemberObjects = [];
        snapshot.forEach(doc => {
            currentFullMemberObjects.push(doc.data());
        });

        // 参加・未確定を上、不参加を下へソート
        currentFullMemberObjects.sort((a, b) => {
            const score = { "⭕参加": 1, "🔺未確定": 2, "❌不参加": 3 };
            return (score[a.status] || 9) - (score[b.status] || 9);
        });

        let html = "";
        currentFullMemberObjects.forEach(m => {
            let stColor = m.status === "⭕参加" ? "background:#e2f0d9;color:#385723;" : (m.status === "🔺未確定" ? "background:#fff3cd;color:#856404;" : "background:#f8d7da;color:#721c24;");
            
            html += `
                <div class="member-list-item">
                    <div>
                        <span>👤 ${m.name} <span class="st-indicator" style="${stColor}">${m.status}</span></span>
                    </div>
                    <button class="btn-danger-sm" onclick="removeMemberFromFirebase('${m.name}')">削除</button>
                </div>
            `;
        });
        document.getElementById('joinedMembersArea').innerHTML = html || '<span style="color:#999; font-size:13px;">参加登録を待っています。</span>';
        
        db.collection("multigroups").doc(uniqueGroupId).get().then(d => { if(d.exists) syncAndRenderRooms(d.data().currentResult); });
    });
}

function saveEventDescription() {
    const descText = document.getElementById('eventDescriptionInput').value;
    db.collection("multigroups").doc(uniqueGroupId).update({
        description: descText
    }).then(() => {
        alert("📢 説明文を更新し、参加者画面へリアルタイム配信しました！");
    }).catch(e => alert("エラー: " + e));
}

function removeMemberFromFirebase(name) {
    if(!confirm(`「${name}」さんを完全削除しますか？`)) return;
    db.collection("multigroups").doc(uniqueGroupId).collection("members").doc(name).delete();
}

// 🛠️ 修正点：部屋構成保存時、currentResultがnullの場合でも空枠構造を作って即座に書き換える
function saveRoomsSetupOnly() {
    const rows = document.querySelectorAll('.room-row');
    
    let newSetup = [];
    rows.forEach((row, i) => {
        const roomId = row.getAttribute('data-room-id');
        const name = row.querySelector('.setup-room-name').value.trim() || `部屋${i+1}`;
        const cap = parseInt(row.querySelector('.setup-room-cap').value) || 5;
        const model = row.querySelector('.setup-room-model').value.trim();
        const memo = row.querySelector('.setup-room-memo').value.trim();
        
        newSetup.push({
            id: roomId,
            name: name,
            capacity: cap,
            model: model, memo: memo, members: []
        });
    });
    
    db.collection("multigroups").doc(uniqueGroupId).get().then(doc => {
        let updateData = { roomsSetup: newSetup };
        
        // currentResultがnullの場合は、新構成ベースの配列構造で初期化して同期ズレを防ぐ
        if (!doc.exists || !doc.data().currentResult) {
            let notArrived = { id: "special_not_arrived", name: "⚠️ 未参加（受付待ち・固定枠）", members: [], isSpecial: true };
            let unconfirmed = { id: "special_unconfirmed", name: "🔺 保留・未確定（固定枠）", members: [], isSpecial: true };
            let leftHome = { id: "special_left_home", name: "❌ 帰宅・不参加（固定枠）", members: [], isSpecial: true };
            updateData.currentResult = [...JSON.parse(JSON.stringify(newSetup)), notArrived, unconfirmed, leftHome];
        } else {
            // すでにcurrentResultがある場合は、既存の割当を生かすため部屋名や設定のみをマッピング
            let oldResult = doc.data().currentResult;
            let updatedResult = newSetup.map(nRoom => {
                let matchOld = oldResult.find(oRoom => oRoom.id === nRoom.id);
                nRoom.members = matchOld ? (matchOld.members || []) : [];
                return nRoom;
            });
            // 特殊部屋枠を維持して統合
            oldResult.forEach(oRoom => {
                if(oRoom.isSpecial) updatedResult.push(oRoom);
            });
            updateData.currentResult = updatedResult;
        }

        db.collection("multigroups").doc(uniqueGroupId).update(updateData).then(() => {
            cachedRoomsSetup = newSetup;
            syncAndRenderRooms(updateData.currentResult);
            alert("💾 部屋構成を上書き保存しました！部屋名が変わってもメンバーは維持されます。");
        });
    });
}

// 🛠️ 修正点：dbRoomsがnull（初期状態）のときでもエラーにならず、安全に部屋枠＋メンバーを自動マッピングする
function syncAndRenderRooms(dbRooms) {
    let baseNormalRooms = JSON.parse(JSON.stringify(cachedRoomsSetup || []));
    baseNormalRooms.forEach(r => r.members = []); 

    let notArrived = { id: "special_not_arrived", name: "⚠️ 未参加（受付待ち・固定枠）", members: [], isSpecial: true };
    let unconfirmed = { id: "special_unconfirmed", name: "🔺 保留・未確定（固定枠）", members: [], isSpecial: true };
    let leftHome = { id: "special_left_home", name: "❌ 帰宅・不参加（固定枠）", members: [], isSpecial: true };

    let allValidNames = currentFullMemberObjects.map(obj => obj.name);

    // dbRooms が存在する場合のみマッピングを解析
    if (dbRooms && dbRooms.length > 0) {
        dbRooms.forEach(oldRoom => {
            if (!oldRoom.isSpecial) {
                let targetRoom = baseNormalRooms.find(r => r.id === oldRoom.id);
                if (targetRoom && oldRoom.members) {
                    targetRoom.members = oldRoom.members.filter(m => allValidNames.includes(m));
                } else if (!targetRoom && oldRoom.members) {
                    notArrived.members = notArrived.members.concat(oldRoom.members.filter(m => allValidNames.includes(m)));
                }
            } else {
                let validM = oldRoom.members ? oldRoom.members.filter(m => allValidNames.includes(m)) : [];
                if (oldRoom.id === "special_not_arrived") notArrived.members = notArrived.members.concat(validM);
                if (oldRoom.id === "special_unconfirmed") unconfirmed.members = unconfirmed.members.concat(validM);
                if (oldRoom.id === "special_left_home") leftHome.members = leftHome.members.concat(validM);
            }
        });
    }

    notArrived.members = [...new Set(notArrived.members)];
    unconfirmed.members = [...new Set(unconfirmed.members)];
    leftHome.members = [...new Set(leftHome.members)];

    let assignedNames = [];
    baseNormalRooms.forEach(r => { assignedNames = assignedNames.concat(r.members); });
    assignedNames = assignedNames.concat(notArrived.members, unconfirmed.members, leftHome.members);

    currentFullMemberObjects.forEach(obj => {
        if (!assignedNames.includes(obj.name)) {
            if (obj.status === "⭕参加") notArrived.members.push(obj.name);
            else if (obj.status === "🔺未確定") unconfirmed.members.push(obj.name);
            else if (obj.status === "❌不参加") leftHome.members.push(obj.name);
        }
    });

    currentFullMemberObjects.forEach(obj => {
        if (obj.status === "❌不参加" && !leftHome.members.includes(obj.name)) {
            baseNormalRooms.forEach(r => { r.members = r.members.filter(m => m !== obj.name); });
            notArrived.members = notArrived.members.filter(m => m !== obj.name);
            unconfirmed.members = unconfirmed.members.filter(m => m !== obj.name);
            if(!leftHome.members.includes(obj.name)) leftHome.members.push(obj.name);
        }
        if (obj.status === "🔺未確定" && !unconfirmed.members.includes(obj.name) && !leftHome.members.includes(obj.name)) {
            baseNormalRooms.forEach(r => { r.members = r.members.filter(m => m !== obj.name); });
            notArrived.members = notArrived.members.filter(m => m !== obj.name);
            leftHome.members = leftHome.members.filter(m => m !== obj.name);
            if(!unconfirmed.members.includes(obj.name)) unconfirmed.members.push(obj.name);
        }
        if (obj.status === "⭕参加" && (leftHome.members.includes(obj.name) || unconfirmed.members.includes(obj.name))) {
            leftHome.members = leftHome.members.filter(m => m !== obj.name);
            unconfirmed.members = unconfirmed.members.filter(m => m !== obj.name);
            if(!notArrived.members.includes(obj.name)) notArrived.members.push(obj.name);
        }
    });

    let finalRoomsStructure = [...baseNormalRooms, notArrived, unconfirmed, leftHome];

    let html = '';
    finalRoomsStructure.forEach((r, roomIdx) => {
        const isSpec = r.isSpecial;
        const extraInfo = [r.model, r.memo].filter(Boolean).join(' / ');
        let boxColor = 'border-left:4px solid var(--primary); background:#fff;';
        if(r.id === "special_not_arrived") boxColor = 'border-left:4px solid var(--success); background:#f2faf4;';
        if(r.id === "special_unconfirmed") boxColor = 'border-left:4px solid var(--warning); background:#fffdf2;';
        if(r.id === "special_left_home") boxColor = 'border-left:4px solid var(--danger); background:#fdf3f4;';

        html += `
            <div class="room-box-result" style="${boxColor}">
                <div class="room-title-bar">
                    <span style="font-weight:bold;">${r.name} ${extraInfo ? `<span>(${extraInfo})</span>` : ''}</span>
                    <span style="color:#666; font-size:12px;">${r.members.length}人</span>
                </div>
                <div class="member-container-flex">
        `;
        
        if (r.members.length === 0) {
            html += `<span style="color:#ccc; font-size:11px; padding:4px 0;">空き</span>`;
        } else {
            r.members.forEach(m => {
                let selectHtml = `<select class="move-select" onchange="moveMemberManually('${m}', ${roomIdx}, this.value)">`;
                selectHtml += `<option value="" disabled selected>➡部屋移動</option>`;
                finalRoomsStructure.forEach((targetRoom, targetIdx) => {
                    if (roomIdx !== targetIdx) {
                        selectHtml += `<option value="${targetIdx}">${targetRoom.name.substring(0,8)}</option>`;
                    }
                });
                selectHtml += `</select>`;
                
                html += `
                    <span class="member-wrapper ${isSpec ? 'is-special' : ''}">
                        <span class="member-name-span">${m}</span>
                        ${selectHtml}
                    </span>
                `;
            });
        }
        html += `</div></div>`;
    });
    document.getElementById('resultInside').innerHTML = html;
}

// 🛠️ 修正点：currentResultがnullの時でも、現在の部屋割りを自動生成してクラッシュせずに移動を実行する
function moveMemberManually(memberName, fromRoomIdx, toRoomIdx) {
    db.collection("multigroups").doc(uniqueGroupId).get().then(doc => {
        if (!doc.exists) return;
        
        let rooms = doc.data().currentResult || [];
        
        // currentResultがnullの場合は、描画ロジックと同様の構造オブジェクトをその場で作る
        if(rooms.length === 0) {
            let baseNormalRooms = JSON.parse(JSON.stringify(cachedRoomsSetup || []));
            baseNormalRooms.forEach(r => r.members = []); 
            let notArrived = { id: "special_not_arrived", name: "⚠️ 未参加（受付待ち・固定枠）", members: [], isSpecial: true };
            let unconfirmed = { id: "special_unconfirmed", name: "🔺 保留・未確定（固定枠）", members: [], isSpecial: true };
            let leftHome = { id: "special_left_home", name: "❌ 帰宅・不参加（固定枠）", members: [], isSpecial: true };
            
            // 全メンバーを一旦割り当てる
            currentFullMemberObjects.forEach(obj => {
                if (obj.status === "⭕参加") notArrived.members.push(obj.name);
                else if (obj.status === "🔺未確定") unconfirmed.members.push(obj.name);
                else if (obj.status === "❌不参加") leftHome.members.push(obj.name);
            });
            rooms = [...baseNormalRooms, notArrived, unconfirmed, leftHome];
        }

        rooms[fromRoomIdx].members = rooms[fromRoomIdx].members.filter(m => m !== memberName);
        rooms[toRoomIdx].members.push(memberName);

        let targetId = rooms[toRoomIdx].id;
        if (targetId === "special_unconfirmed") {
            db.collection("multigroups").doc(uniqueGroupId).collection("members").doc(memberName).update({ status: "🔺未確定" });
        } else if (targetId === "special_left_home") {
            db.collection("multigroups").doc(uniqueGroupId).collection("members").doc(memberName).update({ status: "❌不参加" });
        } else if (targetId === "special_not_arrived") {
            db.collection("multigroups").doc(uniqueGroupId).collection("members").doc(memberName).update({ status: "⭕参加" });
        }

        db.collection("multigroups").doc(uniqueGroupId).update({ currentResult: rooms });
    });
}

function executeSmartShuffle() {
    db.collection("multigroups").doc(uniqueGroupId).get().then(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        let rooms = data.currentResult || [];
        if (rooms.length === 0) return;

        let notArrived = rooms.find(r => r.id === "special_not_arrived");
        let unconfirmed = rooms.find(r => r.id === "special_unconfirmed");
        let leftHome = rooms.find(r => r.id === "special_left_home");

        let normalRooms = rooms.filter(r => !r.isSpecial);
        let shuffleTargets = [];
        normalRooms.forEach(r => { shuffleTargets = shuffleTargets.concat(r.members); r.members = []; });

        if (shuffleTargets.length === 0) {
            alert("現在、各部屋に配置されている『受付済み』の参加者がいません。まずは下の未参加枠からメンバーを部屋へ移動（受付）させてください。");
            return;
        }

        shuffleTargets.sort(() => Math.random() - 0.5);

        while (shuffleTargets.length > 0) {
            const member = shuffleTargets.pop();
            let bestRoomIdx = -1; let minPenalty = Infinity;
            for (let i = 0; i < normalRooms.length; i++) {
                if (normalRooms[i].members.length >= normalRooms[i].capacity) continue;
                let penalty = 0;
                normalRooms[i].members.forEach(exM => {
                    const pairKey = [member, exM].sort().join('-'); penalty += (historyMatrix[pairKey] || 0) * 10;
                });
                penalty += normalRooms[i].members.length;
                if (penalty < minPenalty) { minPenalty = penalty; bestRoomIdx = i; }
            }
            if (bestRoomIdx !== -1) normalRooms[bestRoomIdx].members.push(member);
            else { alert("通常部屋の定員が不足しています。"); return; }
        }

        let finalRooms = [...normalRooms, notArrived, unconfirmed, leftHome];
        db.collection("multigroups").doc(uniqueGroupId).update({ currentResult: finalRooms }).then(() => {
            alert("🔀 自動シャッフルが完了し、参加者画面へ配信しました！");
        });
    });
}

function clearKanjiState() {
    localStorage.removeItem(kanjiStorageKey);
    if (unsubscribeMembers) unsubscribeMembers();
    if (unsubscribeStatus) unsubscribeStatus();
    uniqueGroupId = "";
    document.getElementById('roomsSetupContainer').innerHTML = "";
    document.getElementById('resultInside').innerHTML = '';
    document.getElementById('step2_mainDashboard').style.display = 'none';
    document.getElementById('step1_connection').style.display = 'block';
    renderHistoryList();
}

async function resetCurrentEvent() {
    if (!confirm("完全にデータを削除して解散しますか？\n(この操作をすると、他の幹事や参加者もアクセスできなくなります)")) return;
    try {
        const targetId = uniqueGroupId;
        await db.collection("multigroups").doc(targetId).update({ currentResult: null, status: "reset" });
        const snapshot = await db.collection("multigroups").doc(targetId).collection("members").get();
        const batch = db.batch(); snapshot.forEach(doc => batch.delete(doc.ref)); await batch.commit();
        
        const historyData = localStorage.getItem(historyStorageKey);
        if (historyData) {
            let historyList = JSON.parse(historyData);
            historyList = historyList.filter(item => item.id !== targetId);
            localStorage.setItem(historyStorageKey, JSON.stringify(historyList));
        }
        
        clearKanjiState(); alert("🧹 初期化しました");
    } catch (e) { alert(e); }
}

function copyRoomCode() { navigator.clipboard.writeText(uniqueGroupId); alert("コードをコピーしました"); }
function copyShareUrl() { 
    const shareUrlInput = document.getElementById('shareUrl');
    const descInput = document.getElementById('eventDescriptionInput');
    
    if (shareUrlInput) {
        let textToCopy = "";
        
        // 説明文があれば、URLの前に説明文と改行を追加する
        if (descInput && descInput.value.trim() !== "") {
            textToCopy = descInput.value.trim() + "\n\n" + shareUrlInput.value;
        } else {
            // 説明文が空ならURL単体でコピー
            textToCopy = shareUrlInput.value;
        }
        
        navigator.clipboard.writeText(textToCopy); 
        alert("案内文とURLを合わせてコピーしました！\nそのままLINE等に貼り付けられます。"); 
    }
}
