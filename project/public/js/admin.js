document.querySelectorAll('.approve-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const row = btn.closest('.table-row');
    const status = row.querySelector('.status');
    status.textContent = 'Approved';
    status.className = 'status approved';
  });
});

document.querySelectorAll('.reject-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const row = btn.closest('.table-row');
    const status = row.querySelector('.status');
    status.textContent = 'Rejected';
    status.className = 'status rejected';
  });
});

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'login.html';
  });
}


const signInBtn = document.getElementById('signInBtn');

if (signInBtn) {
  signInBtn.addEventListener('click', signIn);
}
