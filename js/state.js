// Shared app state and constants.
// Modules read and write state through this object
// (ES module bindings cannot be reassigned by importers).
export const state = {
    currentTab: 'government',
    undergroundData: [],
    governmentData: [],
    selectedItems: new Set(),
    showTodPrice: false,
    currentFilter: 'all',
    slipMeta: { owner: '', receiver: '', drawDate: '' },
    // รายการที่กำลังแก้ไข: เก็บไว้ในลิสต์จนกว่าจะกดเพิ่ม เพื่อไม่ให้ข้อมูลหายถ้าเผลอแตะ
    editingIds: { underground: null, government: null }
};

export const SLIP_META_KEY = 'lottery_slip_meta';

// เวอร์ชันโครงสร้างข้อมูลใน localStorage (ใช้ตอน migrate)
export const DATA_VERSION = '1.1';

// จำนวนหลักของเลขแต่ละประเภท
export const NUMBER_LENGTHS = {
    underground: { '3bon': 3, '2bon': 2, '2lang': 2, 'runBon': 1, 'runLang': 1 },
    government: { '6': 6, 'front3': 3, 'back3': 3, 'back2': 2 }
};

export const typeNames = {
    '3bon': '3 ตัวบน',
    '2bon': '2 ตัวบน',
    '2lang': '2 ตัวล่าง',
    'runBon': 'วิ่งบน',
    'runLang': 'วิ่งล่าง',
    '6': '6 ตัวตรง',
    'front3': 'เลขหน้า 3 ตัว',
    'back3': 'เลขท้าย 3 ตัว',
    'back2': 'เลขท้าย 2 ตัว'
};
