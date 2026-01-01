import asyncio
import websockets
import json
import random
from datetime import datetime
from collections import defaultdict
import uuid

class EmpireGame:
    def __init__(self, player_id):
        self.player_id = player_id
        self.player = {
            "id": player_id,
            "name": "",
            "money": 1000,
            "reputation": 10,
            "police_attention": 0,
            "influence": 0,
            "energy": 100,
            "day": 1,
            "legal_businesses": [],
            "illegal_businesses": [],
            "contacts": [],
            "active_orders": [],
            "bribes_paid": 0,
            "arrests_avoided": 0,
            "stocks": defaultdict(int)  # Добавляем портфель акций
        }
        
        self.market = {
            "ТехноКорп": {"price": 100, "trend": 0},
            "ГорЭнерго": {"price": 50, "trend": 0},
            "АгроПром": {"price": 75, "trend": 0}
        }
        
        self.legal_jobs = [
            {"name": "Разнорабочий", "pay": 100, "energy": 20, "rep_gain": 1},
            {"name": "Курьер", "pay": 150, "energy": 25, "rep_gain": 2},
            {"name": "Продавец", "pay": 120, "energy": 22, "rep_gain": 1}
        ]
        
        self.legal_businesses = [
            {"name": "Небольшое кафе", "cost": 5000, "income": 300, "risk": 5, "rep_gain": 10},
            {"name": "Магазин электроники", "cost": 15000, "income": 700, "risk": 10, "rep_gain": 20},
            {"name": "IT-стартап", "cost": 50000, "income": 2000, "risk": 30, "rep_gain": 50}
        ]
        
        self.illegal_businesses = [
            {"name": "Подпольный цех", "cost": 10000, "income": 800, "risk": 40, "inf_gain": 20},
            {"name": "Сеть курьеров", "cost": 25000, "income": 1500, "risk": 60, "inf_gain": 40},
            {"name": "Хакерская группа", "cost": 50000, "income": 3000, "risk": 70, "inf_gain": 60}
        ]
        
        self.possible_orders = [
            {"item": "Электроника", "amount": "20-50", "profit_per_unit": 80, "risk": 20, "difficulty": "Низкая"},
            {"item": "Медикаменты", "amount": "10-30", "profit_per_unit": 150, "risk": 35, "difficulty": "Средняя"},
            {"item": "Цифровые товары", "amount": "50-100", "profit_per_unit": 40, "risk": 15, "difficulty": "Низкая"},
            {"item": "Редкие компоненты", "amount": "5-15", "profit_per_unit": 300, "risk": 50, "difficulty": "Высокая"}
        ]
        
        self.possible_contacts = [
            {"name": "Бывалый моряк", "description": "Может провезти товар через порт", "cost": 1000, "risk_reduction": 15},
            {"name": "Хакер 'Призрак'", "description": "Взламывает системы слежения", "cost": 2000, "risk_reduction": 25},
            {"name": "Чиновник из мэрии", "description": "Имеет доступ к закрытой информации", "cost": 5000, "risk_reduction": 40}
        ]
        
        self.game_active = True

    def get_state(self):
        return {
            "player": self.player,
            "market": self.market,
            "legal_jobs": self.legal_jobs,
            "legal_businesses": self.legal_businesses,
            "illegal_businesses": self.illegal_businesses,
            "possible_orders": self.possible_orders,
            "possible_contacts": self.possible_contacts,
            "day": self.player["day"],
            "game_active": self.game_active
        }

    def work_legal(self, job_index):
        job = self.legal_jobs[job_index]
        
        if self.player["energy"] >= job["energy"]:
            self.player["money"] += job["pay"]
            self.player["energy"] -= job["energy"]
            self.player["reputation"] += job["rep_gain"]
            
            # Небольшой шанс события
            event = None
            if random.random() < 0.1:
                bonus = 50
                self.player["money"] += bonus
                event = f"🌟 Вам дали премию за хорошую работу! +${bonus}"
            
            return {
                "success": True,
                "message": f"✅ Вы отработали как {job['name']} и заработали ${job['pay']}!",
                "event": event
            }
        else:
            return {
                "success": False,
                "message": "❌ Слишком мало энергии!"
            }

    def update_market(self):
        # Обновляем цены
        for company in self.market:
            change = random.uniform(-0.2, 0.2)
            self.market[company]["price"] = max(10, int(self.market[company]["price"] * (1 + change)))
            self.market[company]["trend"] = change * 100
        
        return self.market

    def buy_stocks(self, company_index, amount):
        companies = list(self.market.keys())
        if company_index < 0 or company_index >= len(companies):
            return {"success": False, "message": "❌ Неверный выбор компании!"}
        
        company = companies[company_index]
        price = self.market[company]["price"]
        max_can_buy = self.player["money"] // price
        
        if amount <= 0 or amount > max_can_buy:
            return {"success": False, "message": f"❌ Неверное количество! Максимум: {max_can_buy}"}
        
        cost = amount * price
        self.player["money"] -= cost
        self.player["stocks"][company] += amount
        
        return {
            "success": True,
            "message": f"✅ Куплено {amount} акций {company} за ${cost}",
            "new_balance": self.player["money"]
        }

    def sell_stocks(self, company_index, amount):
        companies = list(self.market.keys())
        if company_index < 0 or company_index >= len(companies):
            return {"success": False, "message": "❌ Неверный выбор компании!"}
        
        company = companies[company_index]
        if self.player["stocks"][company] < amount:
            return {"success": False, "message": f"❌ У вас нет столько акций {company}!"}
        
        price = self.market[company]["price"]
        
        # Реалистичная продажа с небольшими колебаниями
        sale_price = price * random.uniform(0.9, 1.1)
        total = int(amount * sale_price)
        
        self.player["money"] += total
        self.player["stocks"][company] -= amount
        
        profit_loss = total - (amount * price)
        if profit_loss > 0:
            message = f"✅ Продано {amount} акций {company} с прибылью ${profit_loss}!"
        else:
            message = f"✅ Продано {amount} акций {company} с убытком ${-profit_loss}."
        
        return {
            "success": True,
            "message": message,
            "new_balance": self.player["money"]
        }

    def find_order(self):
        if self.player["energy"] < 30:
            return {"success": False, "message": "❌ Слишком мало энергии для поиска заказов!"}
        
        self.player["energy"] -= 30
        order = random.choice(self.possible_orders)
        
        amount_range = order["amount"].split("-")
        amount = random.randint(int(amount_range[0]), int(amount_range[1]))
        total_profit = amount * order["profit_per_unit"]
        
        risk = order["risk"]
        if self.player["influence"] > 50:
            risk = int(risk * 0.7)
        
        return {
            "success": True,
            "order": {
                "item": order["item"],
                "amount": amount,
                "profit": total_profit,
                "risk": risk,
                "difficulty": order["difficulty"]
            },
            "energy_left": self.player["energy"]
        }

    def accept_order(self, order_data):
        self.player["active_orders"].append({
            "item": order_data["item"],
            "amount": order_data["amount"],
            "profit": order_data["profit"],
            "risk": order_data["risk"],
            "days_left": random.randint(2, 4)
        })
        return {"success": True, "message": f"✅ Заказ на {order_data['item']} принят!"}

    def find_contact(self):
        if self.player["energy"] < 25:
            return {"success": False, "message": "❌ Слишком мало энергии для поиска контактов!"}
        
        self.player["energy"] -= 25
        contact = random.choice(self.possible_contacts)
        
        return {
            "success": True,
            "contact": contact,
            "energy_left": self.player["energy"]
        }

    def hire_contact(self, contact_data):
        if self.player["money"] >= contact_data["cost"]:
            self.player["money"] -= contact_data["cost"]
            self.player["contacts"].append(contact_data["name"])
            return {"success": True, "message": f"✅ Контакт {contact_data['name']} теперь работает на вас!"}
        else:
            return {"success": False, "message": "❌ Недостаточно денег!"}

    def hide_from_police(self, method):
        if self.player["police_attention"] == 0:
            return {"success": False, "message": "✅ Полиция вас пока не ищет."}
        
        if method == "bribe":
            if self.player["money"] >= 3000:
                self.player["money"] -= 3000
                self.player["police_attention"] = max(0, self.player["police_attention"] - 25)
                self.player["bribes_paid"] += 1
                return {"success": True, "message": "✅ Взятка дана! Внимание полиции снижено."}
            else:
                return {"success": False, "message": "❌ Недостаточно денег!"}
        
        elif method == "official":
            if self.player["money"] >= 10000:
                self.player["money"] -= 10000
                self.player["police_attention"] = max(0, self.player["police_attention"] - 40)
                self.player["bribes_paid"] += 1
                return {"success": True, "message": "✅ Чиновник подкуплен! У вас теперь есть 'крыша'."}
            else:
                return {"success": False, "message": "❌ Недостаточно денег!"}
        
        elif method == "lay_low":
            self.player["police_attention"] = max(0, self.player["police_attention"] - 10)
            self.player["day"] += 2
            return {"success": True, "message": "✅ Вы легли на дно. 2 дня прошло, внимание снижено."}
        
        return {"success": False, "message": "❌ Неизвестный метод."}

    def buy_business(self, business_type, business_index):
        businesses = self.legal_businesses if business_type == "legal" else self.illegal_businesses
        player_businesses = self.player["legal_businesses"] if business_type == "legal" else self.player["illegal_businesses"]
        
        if business_index < 0 or business_index >= len(businesses):
            return {"success": False, "message": "❌ Неверный выбор бизнеса!"}
        
        biz = businesses[business_index]
        
        if biz["name"] in player_businesses:
            return {"success": False, "message": "❌ У вас уже есть этот бизнес!"}
        
        if self.player["money"] >= biz["cost"]:
            self.player["money"] -= biz["cost"]
            
            if business_type == "legal":
                self.player["legal_businesses"].append(biz["name"])
                self.player["reputation"] += biz["rep_gain"]
            else:
                self.player["illegal_businesses"].append(biz["name"])
                self.player["influence"] = min(100, self.player["influence"] + biz["inf_gain"])
                self.player["police_attention"] = min(100, self.player["police_attention"] + 10)
            
            return {"success": True, "message": f"✅ Поздравляем! Вы купили {biz['name']}!"}
        else:
            return {"success": False, "message": "❌ Недостаточно денег!"}

    def collect_income(self):
        income_messages = []
        total_income = 0
        
        # Доход от легального бизнеса
        for biz_name in self.player["legal_businesses"]:
            biz = next((b for b in self.legal_businesses if b["name"] == biz_name), None)
            if biz:
                self.player["money"] += biz["income"]
                total_income += biz["income"]
        
        # Доход от нелегального бизнеса
        for biz_name in self.player["illegal_businesses"]:
            biz = next((b for b in self.illegal_businesses if b["name"] == biz_name), None)
            if biz:
                self.player["money"] += biz["income"]
                total_income += biz["income"]
                
                # Риск ареста
                if random.random() * 100 < biz["risk"]:
                    income_messages.append(f"⚠️  Полиция проверила ваш {biz_name}!")
                    self.player["police_attention"] = min(100, self.player["police_attention"] + 15)
        
        if total_income > 0:
            income_messages.insert(0, f"💰 Собрано доходов: ${total_income}")
        
        return income_messages

    def complete_orders(self):
        completed_messages = []
        completed = []
        
        for order in self.player["active_orders"]:
            order["days_left"] -= 1
            
            if order["days_left"] <= 0:
                # Шанс провала
                if random.random() * 100 < order["risk"]:
                    completed_messages.append(f"❌ ПРОВАЛ! Заказ на {order['item']} провален!")
                    completed_messages.append("   Полиция обнаружила вашу операцию!")
                    self.player["police_attention"] = min(100, self.player["police_attention"] + order["risk"])
                else:
                    completed_messages.append(f"✅ УСПЕХ! Заказ на {order['item']} выполнен!")
                    completed_messages.append(f"   Прибыль: ${order['profit']:,}")
                    self.player["money"] += order["profit"]
                    self.player["influence"] = min(100, self.player["influence"] + 5)
                
                completed.append(order)
        
        for order in completed:
            self.player["active_orders"].remove(order)
        
        return completed_messages

    def random_event(self):
        events = [
            {
                "text": "🏆 Вы выиграли в лотерею!",
                "effect": lambda: self.player.update({"money": self.player["money"] + 1000})
            },
            {
                "text": "💸 Вас ограбили на улице!",
                "effect": lambda: self.player.update({"money": max(0, self.player["money"] - 500)})
            },
            {
                "text": "👮 Полиция проводит облаву в вашем районе!",
                "effect": lambda: self.player.update({"police_attention": min(100, self.player["police_attention"] + 20)})
            },
            {
                "text": "🤝 Старый друг предлагает выгодную сделку!",
                "effect": lambda: self.player.update({"money": self.player["money"] + 800, "reputation": min(100, self.player["reputation"] + 5)})
            },
            {
                "text": "🔥 Пожар на одном из ваших предприятий!",
                "effect": lambda: self.player.update({"money": max(0, self.player["money"] - 2000)})
            }
        ]
        
        if random.random() < 0.3:
            event = random.choice(events)
            event["effect"]()
            return event["text"]
        return None

    def police_check(self):
        if self.player["police_attention"] >= 100:
            messages = []
            
            loss_percentage = random.randint(30, 70)
            money_loss = int(self.player["money"] * loss_percentage / 100)
            self.player["money"] = max(0, self.player["money"] - money_loss)
            
            # Потеря нелегального бизнеса
            if self.player["illegal_businesses"] and random.random() > 0.3:
                lost_biz = random.choice(self.player["illegal_businesses"])
                self.player["illegal_businesses"].remove(lost_biz)
                messages.append(f"❌ Конфискован ваш {lost_biz}!")
            
            self.player["police_attention"] = 20
            self.player["influence"] = max(0, self.player["influence"] - 20)
            
            messages.append(f"🚨 ПОЛИЦИЯ ПРОВЕЛА ОБЫСК!")
            messages.append(f"💸 Вы потеряли ${money_loss:,} и часть влияния!")
            
            return messages
        return []

    def next_day(self):
        day_messages = []
        
        self.player["day"] += 1
        self.player["energy"] = min(100, self.player["energy"] + 30)
        
        # Снижаем внимание полиции со временем
        if self.player["police_attention"] > 0:
            self.player["police_attention"] = max(0, self.player["police_attention"] - 5)
        
        # Собираем доходы
        income_msgs = self.collect_income()
        day_messages.extend(income_msgs)
        
        # Выполняем заказы
        order_msgs = self.complete_orders()
        day_messages.extend(order_msgs)
        
        # Случайное событие
        event_msg = self.random_event()
        if event_msg:
            day_messages.append(f"🎲 СОБЫТИЕ: {event_msg}")
        
        # Проверка полиции
        police_msgs = self.police_check()
        day_messages.extend(police_msgs)
        
        return day_messages

    def set_player_name(self, name):
        self.player["name"] = name.strip() or "Игрок"
        return {"success": True, "message": f"👋 Добро пожаловать, {self.player['name']}!"}


class GameServer:
    def __init__(self):
        self.games = {}
        self.connections = {}
    
    async def handle_client(self, websocket, path):
        player_id = str(uuid.uuid4())
        self.connections[player_id] = websocket
        game = None
        
        try:
            async for message in websocket:
                data = json.loads(message)
                action = data.get("action")
                
                if action == "start_game":
                    name = data.get("name", "Игрок")
                    game = EmpireGame(player_id)
                    game.set_player_name(name)
                    await websocket.send(json.dumps({
                        "type": "game_state",
                        "data": game.get_state(),
                        "message": "🎮 Игра началась!"
                    }))
                
                elif action == "get_state" and game:
                    await websocket.send(json.dumps({
                        "type": "game_state",
                        "data": game.get_state()
                    }))
                
                elif action == "work_legal" and game:
                    job_index = data.get("job_index", 0)
                    result = game.work_legal(job_index)
                    await websocket.send(json.dumps({
                        "type": "action_result",
                        "data": result,
                        "game_state": game.get_state()
                    }))
                
                elif action == "update_market" and game:
                    market = game.update_market()
                    await websocket.send(json.dumps({
                        "type": "market_update",
                        "data": market,
                        "game_state": game.get_state()
                    }))
                
                elif action == "buy_stocks" and game:
                    company_index = data.get("company_index", 0)
                    amount = data.get("amount", 0)
                    result = game.buy_stocks(company_index, amount)
                    await websocket.send(json.dumps({
                        "type": "action_result",
                        "data": result,
                        "game_state": game.get_state()
                    }))
                
                elif action == "sell_stocks" and game:
                    company_index = data.get("company_index", 0)
                    amount = data.get("amount", 0)
                    result = game.sell_stocks(company_index, amount)
                    await websocket.send(json.dumps({
                        "type": "action_result",
                        "data": result,
                        "game_state": game.get_state()
                    }))
                
                elif action == "find_order" and game:
                    result = game.find_order()
                    await websocket.send(json.dumps({
                        "type": "order_found",
                        "data": result
                    }))
                
                elif action == "accept_order" and game:
                    order_data = data.get("order_data")
                    result = game.accept_order(order_data)
                    await websocket.send(json.dumps({
                        "type": "action_result",
                        "data": result,
                        "game_state": game.get_state()
                    }))
                
                elif action == "find_contact" and game:
                    result = game.find_contact()
                    await websocket.send(json.dumps({
                        "type": "contact_found",
                        "data": result
                    }))
                
                elif action == "hire_contact" and game:
                    contact_data = data.get("contact_data")
                    result = game.hire_contact(contact_data)
                    await websocket.send(json.dumps({
                        "type": "action_result",
                        "data": result,
                        "game_state": game.get_state()
                    }))
                
                elif action == "hide_from_police" and game:
                    method = data.get("method")
                    result = game.hide_from_police(method)
                    await websocket.send(json.dumps({
                        "type": "action_result",
                        "data": result,
                        "game_state": game.get_state()
                    }))
                
                elif action == "buy_business" and game:
                    business_type = data.get("business_type")
                    business_index = data.get("business_index", 0)
                    result = game.buy_business(business_type, business_index)
                    await websocket.send(json.dumps({
                        "type": "action_result",
                        "data": result,
                        "game_state": game.get_state()
                    }))
                
                elif action == "next_day" and game:
                    messages = game.next_day()
                    await websocket.send(json.dumps({
                        "type": "day_complete",
                        "data": {
                            "messages": messages,
                            "day": game.player["day"]
                        },
                        "game_state": game.get_state()
                    }))
                
                else:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "Неизвестное действие или игра не начата"
                    }))
        
        except websockets.exceptions.ConnectionClosed:
            print(f"Соединение закрыто: {player_id}")
        finally:
            if player_id in self.connections:
                del self.connections[player_id]
            if player_id in self.games:
                del self.games[player_id]

async def main():
    server = GameServer()
    port = 8765
    
    print(f"🚀 Сервер Империи Теней запущен на порту {port}")
    print("📡 Ожидание подключений...")
    
    async with websockets.serve(server.handle_client, "localhost", port):
        await asyncio.Future()  # Бесконечное ожидание

if __name__ == "__main__":
    asyncio.run(main())
