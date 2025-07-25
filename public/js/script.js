function showAll() {
  document.querySelectorAll('.tshirt-card').forEach(card => {
    card.style.display = 'block';
  });
}

function filterTshirts() {
  const color = document.getElementById('colorFilter').value;
  const size = document.getElementById('sizeFilter').value;
  document.querySelectorAll('.tshirt-card').forEach(card => {
    const cardColor = card.dataset.color;
    const cardSize = card.dataset.size;
    if ((!color || cardColor === color) && (!size || cardSize === size)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

function hideInfoBlock() {
  const infoBlock = document.querySelector('.info-block');
  if (infoBlock) {
    console.log('Скрываем info-block');
    infoBlock.style.transition = 'opacity 0.3s ease, height 0.3s ease';
    infoBlock.style.opacity = '0';
    infoBlock.style.height = '0';
    setTimeout(() => {
      infoBlock.style.display = 'none';
    }, 5);
  }
}

document.getElementById('colorFilter')?.addEventListener('change', filterTshirts);
document.getElementById('sizeFilter')?.addEventListener('change', filterTshirts);

function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) {
    console.error(`Форма с ID ${formId} не найдена`);
    return;
  }
  const inputs = form.querySelectorAll('input:not([type="file"]), textarea');
  const submitBtn = form.querySelector('button[type="submit"]');
  if (!submitBtn) {
    console.error(`Кнопка submit не найдена в форме ${formId}`);
    return;
  }
  const checkValidity = () => {
    let valid = true;
    inputs.forEach(input => {
      if (!input.value.trim()) {
        valid = false;
        console.log(`Поле ${input.name} пустое`);
      }
    });
    submitBtn.disabled = !valid;
    console.log(`Форма ${formId} валидна: ${valid}`);
  };
  inputs.forEach(input => {
    input.removeEventListener('input', checkValidity);
    input.addEventListener('input', checkValidity);
  });
  checkValidity();
}

function initializeValidation() {
  console.log('Инициализация валидации форм');
  validateForm('contact-form');
  validateForm('login-form');
  validateForm('register-form');
  validateForm('add-form');
  validateForm('edit-form');
}

function showSection(section) {
  console.log(`Показываем секцию: ${section}`);
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  document.getElementById(`${section}-section`).style.display = 'block';
  initializeValidation();
}

function showRegister() {
  console.log('Открываем форму регистрации');
  document.getElementById('register-section').style.display = 'block';
  initializeValidation();
}

function ajaxRequest(method, url, data, callback) {
  console.log(`Отправляем ${method} запрос на ${url}`, data);
  const fetchOptions = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = JSON.stringify(data);
  }
  fetch(url, fetchOptions)
    .then(res => {
      console.log(`Ответ от ${url}: статус ${res.status}`);
      if (!res.ok) {
        return res.json().then(err => {
          throw new Error(err.error || `HTTP ошибка: ${res.status}`);
        });
      }
      return res.json();
    })
    .then(data => {
      console.log(`Данные от ${url}:`, data);
      callback(data);
    })
    .catch(err => {
      console.error(`Ошибка в запросе ${url}:`, err);
      alert(`Ошибка: ${err.message}`);
    });
}

function ajaxFileRequest(method, url, formData, callback) {
  console.log(`Отправляем ${method} запрос с файлом на ${url}`);
  fetch(url, {
    method,
    body: formData
  })
    .then(res => {
      console.log(`Ответ от ${url}: статус ${res.status}`);
      if (!res.ok) {
        return res.json().then(err => {
          throw new Error(err.error || `HTTP ошибка: ${res.status}`);
        });
      }
      return res.json();
    })
    .then(data => {
      console.log(`Данные от ${url}:`, data);
      callback(data);
    })
    .catch(err => {
      console.error(`Ошибка в запросе ${url}:`, err);
      alert(`Ошибка: ${err.message}`);
    });
}

document.getElementById('contact-form')?.addEventListener('submit', e => {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(e.target));
  ajaxRequest('POST', '/contact', formData, data => {
    document.getElementById('contact-message').textContent = data.message;
    document.getElementById('contact-message').style.display = 'block';
    e.target.reset();
  });
});

document.getElementById('login-form')?.addEventListener('submit', e => {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(e.target));
  ajaxRequest('POST', '/login', formData, data => {
    if (data.error) {
      alert(data.error);
    } else {
      window.location.href = data.redirect;
    }
  });
});

document.getElementById('register-form')?.addEventListener('submit', e => {
  e.preventDefault();
  const formData = Object.fromEntries(new FormData(e.target));
  ajaxRequest('POST', '/register', formData, data => {
    if (data.error) {
      alert(data.error);
    } else {
      alert(data.message);
      window.location.href = data.redirect;
    }
  });
});

document.getElementById('add-form')?.addEventListener('submit', e => {
  e.preventDefault();
  console.log('Событие submit для add-form сработало');
  const formData = new FormData(e.target);
  console.log('Отправка формы добавления');
  ajaxFileRequest('POST', '/admin/add', formData, data => {
    alert(data.message);
    window.location.href = data.redirect;
  });
});

function editTshirt(id) {
  console.log('Запуск редактирования футболки с ID:', id);
  ajaxRequest('GET', `/admin/edit/${id}`, {}, tshirt => {
    if (tshirt.error) {
      console.error('Ошибка получения данных футболки:', tshirt.error);
      alert(tshirt.error);
      return;
    }
    console.log('Получены данные футболки:', tshirt);
    const form = document.getElementById('edit-form');
    if (!form) {
      console.error('Форма edit-form не найдена');
      alert('Ошибка: форма редактирования не найдена');
      return;
    }
    form.querySelector('input[name="id"]').value = id;
    form.querySelector('input[name="name"]').value = tshirt.name || '';
    form.querySelector('input[name="price"]').value = tshirt.price || '';
    form.querySelector('input[name="color"]').value = tshirt.color || '';
    form.querySelector('input[name="size"]').value = tshirt.size || '';
    console.log('Форма edit-form заполнена, отображаем');
    form.style.display = 'block';
    initializeValidation();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    console.log('Прокручено к форме редактирования');
  });
}

document.getElementById('edit-form')?.addEventListener('submit', e => {
  e.preventDefault();
  console.log('Событие submit для edit-form сработало');
  const formData = new FormData(e.target);
  const id = formData.get('id');
  console.log('Отправка формы редактирования');
  ajaxFileRequest('PUT', `/admin/edit/${id}`, formData, data => {
    alert(data.message);
    window.location.href = data.redirect;
  });
});

function deleteTshirt(id) {
  console.log('Удаление футболки с ID:', id);
  if (confirm('Вы уверены?')) {
    ajaxRequest('DELETE', `/admin/delete/${id}`, {}, data => {
      alert(data.message);
      window.location.href = data.redirect;
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initializeValidation();
});

document.addEventListener('DOMContentLoaded', () => {
  const colorFilter = document.getElementById('colorFilter');
  const sizeFilter = document.getElementById('sizeFilter');
  const tshirtCards = document.querySelectorAll('.tshirt-card');

  function applyFilters() {
    const selectedColor = colorFilter.value;
    const selectedSize = sizeFilter.value;

    tshirtCards.forEach(card => {
      const cardColor = card.dataset.color || 'Не указан';
      const cardSize = card.dataset.size || 'Не указан';

      const colorMatch = !selectedColor || cardColor === selectedColor;
      const sizeMatch = !selectedSize || cardSize === selectedSize;

      if (colorMatch && sizeMatch) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });

    const tshirtList = document.querySelector('.tshirt-list');
    tshirtList.style.display = 'none';
    void tshirtList.offsetHeight;
    tshirtList.style.display = 'grid';
  }

  colorFilter.addEventListener('change', applyFilters);
  sizeFilter.addEventListener('change', applyFilters);

  applyFilters();
});