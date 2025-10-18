import React, { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, Coins, LogOut, LayoutDashboard, Dice5, GripVertical, Rocket, Settings, User, DollarSign, ArrowUp, ArrowDown, KeyRound, CheckCircle, Lock, Mail, Users, Ban, X, Check, Eye, Trash2, Loader2, Wallet 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, runTransaction, serverTimestamp, orderBy 
} from 'firebase/firestore';

// --- CONFIGURATION & CONSTANTS ---
const ADMIN_EMAIL = 'jcfaissal1@gmail.com'; // Note: Used lowercase for comparison safety
const DEPOSIT_ADDRESSES = {
  'BSC (BEP20) USDT': '0xfdae64afad697024fd31da918d38f2ff68f59f6b',
  'TRON (TRC20) USDT': 'TJRaEJZJxmBGhY5pBcyqEdQTMnpF2BsDU4',
};

// Default/Fallback configuration (used only if __firebase_config is not available)
// FIX for auth/operation-not-allowed: Setting this to empty forces the app to use
// the environment's correctly configured __firebase_config, avoiding the fallback
// project which likely did not have Email/Password auth enabled.
const firebaseConfig = {};

// --- UTILITY FUNCTIONS ---
const generateRandomResult = (max) => Math.floor(Math.random() * max) + 1;
const generateCrashPoint = () => {
  const random = Math.random();
  if (random < 0.02) return 1.05; // 2% chance of crashing early
  return Math.floor((1 / (1 - random)) * 100) / 100;
};


// --- SHARED UI COMPONENTS (Futuristic/Dark Theme) ---

const Card = ({ children, title, className = '' }) => (
  <div className={`p-6 bg-gray-800 rounded-xl shadow-2xl transition-all duration-300 ${className}`}>
    {title && <h2 className="text-xl font-extrabold mb-4 pb-2 border-b border-indigo-700 text-indigo-400">{title}</h2>}
    {children}
  </div>
);

const Button = ({ children, onClick, disabled = false, className = 'bg-indigo-600 hover:bg-indigo-700', type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`w-full px-4 py-3 font-semibold text-white rounded-lg shadow-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed transform hover:scale-[1.01] ${className}`}
  >
    {children}
  </button>
);

const Input = ({ label, value, onChange, type = 'text', min, max, step = 'any', placeholder, disabled = false, icon: Icon, children }) => (
    <div className="mb-4">
        {label && <label className="block text-sm font-medium text-indigo-400 mb-1">{label}</label>}
        <div className="relative">
            {Icon && <Icon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />}
            {type === 'select' ? (
                // Render select element if type is 'select'
                <select
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    className={`w-full p-3 border border-gray-700 rounded-lg bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 ${Icon ? 'pl-10' : ''}`}
                >
                    {children}
                </select>
            ) : (
                // Render input element otherwise
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    min={min}
                    max={max}
                    step={step}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full p-3 border border-gray-700 rounded-lg bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 ${Icon ? 'pl-10' : ''}`}
                />
            )}
        </div>
    </div>
);


// --- AUTHENTICATION COMPONENTS ---

const AuthForm = ({ auth, onLogin, setIsLoading }) => {
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        onLogin(); // App component handles profile setup
      } else if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        setMessage('Sign up successful! Please log in.');
        setMode('login');
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset link sent to your email.');
        setMode('login');
      }
    } catch (err) {
      console.error(err);
      let errorMessage = err.message.replace('Firebase: ', '');
      
      // Improved error message for operation not allowed
      if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Authentication method not enabled. Please ensure Email/Password Sign-in is enabled in your Firebase project settings.';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'signup') return 'Create Account';
    if (mode === 'reset') return 'Reset Password';
    return 'User Login';
  };

  return (
    <Card title={getTitle()} className="max-w-md mx-auto w-full">
      <form onSubmit={handleSubmit}>
        {error && <p className="text-red-500 mb-4 bg-red-900/30 p-2 rounded-lg text-sm">{error}</p>}
        {message && <p className="text-green-500 mb-4 bg-green-900/30 p-2 rounded-lg text-sm">{message}</p>}

        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={Mail} />
        {mode !== 'reset' && (
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} icon={Lock} />
        )}

        <Button type="submit" className="mt-4">
          {mode === 'login' && 'Log In'}
          {mode === 'signup' && 'Sign Up'}
          {mode === 'reset' && 'Send Reset Email'}
        </Button>
      </form>

      <div className="flex justify-between mt-4 text-sm">
        <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-indigo-400 hover:text-indigo-300">
          {mode === 'login' ? 'Need an account? Sign Up' : 'Already have an account? Login'}
        </button>
        {mode === 'login' && (
          <button onClick={() => setMode('reset')} className="text-gray-400 hover:text-gray-300">
            Forgot Password?
          </button>
        )}
      </div>
    </Card>
  );
};


// --- TRANSACTION COMPONENTS (User Side) ---

const DepositWithdraw = ({ userId, walletData, db }) => {
  const [amount, setAmount] = useState(100);
  const [network, setNetwork] = useState('BSC (BEP20) USDT');
  const [txHash, setTxHash] = useState('');
  const [tab, setTab] = useState('Deposit');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Firestore path for all user transactions (Admin viewable)
  const getTransactionCollection = () => {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    return collection(db, 'artifacts', appId, 'public', 'transactions');
  };

  const handleSubmit = async (type) => {
    if (amount <= 0 || (type === 'Withdraw' && amount > walletData.balance)) {
      setMessage(`Invalid amount for ${type}.`);
      return;
    }
    if (type === 'Deposit' && !txHash) {
      setMessage('Transaction Hash is required for Deposit.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const transactionRef = getTransactionCollection();
      const transactionData = {
        userId,
        userEmail: walletData.email,
        type,
        amount: parseFloat(amount),
        network,
        address: type === 'Deposit' ? DEPOSIT_ADDRESSES[network] : 'User Wallet (Not shown for security)',
        txHash: type === 'Deposit' ? txHash : null,
        status: 'Pending', // Key for manual approval
        timestamp: serverTimestamp(),
      };

      await setDoc(doc(transactionRef), transactionData);

      setMessage(`Your ${type} request has been submitted for manual approval. It will be processed shortly.`);
      setTxHash('');
    } catch (error) {
      console.error(`Error submitting ${type} request:`, error);
      setMessage(`Failed to submit request: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const DepositForm = () => (
    <>
      <p className="text-gray-400 mb-6">Send funds to the address below, then submit the details for manual approval.</p>
      <Input label="Deposit Amount (USDT)" type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} min={1} />
      <Input label="Network" type="select" value={network} onChange={(e) => setNetwork(e.target.value)} icon={RefreshCw}>
        {Object.keys(DEPOSIT_ADDRESSES).map(key => (
          <option key={key} value={key}>{key}</option>
        ))}
      </Input>
      <div className="p-4 bg-gray-900 rounded-lg mb-4">
        <p className="text-xs text-indigo-400 font-bold mb-1">Deposit Address ({network})</p>
        <code className="text-xs break-all text-green-400">{DEPOSIT_ADDRESSES[network]}</code>
      </div>
      <Input label="Transaction Hash (Required)" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x..." />
      <Button onClick={() => handleSubmit('Deposit')} disabled={isLoading || !txHash || amount <= 0} className="mt-4 bg-green-600 hover:bg-green-700">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <ArrowUp className="w-4 h-4 inline mr-2" />} Submit Deposit Request
      </Button>
    </>
  );

  const WithdrawForm = () => (
    <>
      <p className="text-gray-400 mb-6">Request a withdrawal. This will be manually processed and sent to your specified address.</p>
      <Input label={`Current Balance (Max ${walletData.balance.toFixed(2)})`} type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} max={walletData.balance} min={1} />
      <Input label="Withdrawal Network" type="select" value={network} onChange={(e) => setNetwork(e.target.value)} icon={RefreshCw}>
        {Object.keys(DEPOSIT_ADDRESSES).map(key => (
          <option key={key} value={key}>{key.replace('Deposit', 'Withdrawal')}</option>
        ))}
      </Input>
      <Input label="Your Receiving Address (BEP20/TRC20)" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="Enter your wallet address" />
      <Button onClick={() => handleSubmit('Withdraw')} disabled={isLoading || !txHash || amount > walletData.balance || amount <= 0} className="mt-4 bg-red-600 hover:bg-red-700">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <ArrowDown className="w-4 h-4 inline mr-2" />} Submit Withdrawal Request
      </Button>
      {walletData.balance < amount && <p className="text-red-500 text-sm mt-2">Insufficient balance.</p>}
    </>
  );

  return (
    <Card title="Deposit & Withdraw">
      <div className="flex mb-6 border-b border-gray-700">
        <button onClick={() => setTab('Deposit')} className={`py-2 px-4 text-lg font-semibold transition-colors ${tab === 'Deposit' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-indigo-300'}`}>Deposit</button>
        <button onClick={() => setTab('Withdraw')} className={`py-2 px-4 text-lg font-semibold transition-colors ${tab === 'Withdraw' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-indigo-300'}`}>Withdraw</button>
      </div>

      {message && <p className={`mb-4 p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{message}</p>}
      
      {tab === 'Deposit' ? <DepositForm /> : <WithdrawForm />}
    </Card>
  );
};


// --- GAME COMPONENTS (User Side) ---
const GameCard = ({ children, title, disabled }) => (
    <Card title={title} className={`relative ${disabled ? 'opacity-50 blur-sm' : ''}`}>
        {disabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-xl z-10">
                <p className="text-xl font-bold text-red-500 p-4 border border-red-500 rounded-lg">Deposit Required</p>
            </div>
        )}
        {children}
    </Card>
);

const CrashGameMock = ({ walletData, updateWallet }) => {
    const [betAmount, setBetAmount] = useState(10);
    const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
    const [isBetting, setIsBetting] = useState(true);
    const [isGameActive, setIsGameActive] = useState(false);
    const [isCashedOut, setIsCashedOut] = useState(false);
    const [message, setMessage] = useState('Place your bet.');
    const [crashPoint, setCrashPoint] = useState(0);

    const gameSpeed = 70;

    const startRound = () => {
        if (betAmount <= 0 || betAmount > walletData.balance) {
            setMessage("Invalid bet.");
            setIsBetting(true);
            return;
        }

        // DEDUCT BET
        updateWallet(-betAmount, 'Crash Bet');

        setCrashPoint(generateCrashPoint());
        setCurrentMultiplier(1.00);
        setIsBetting(false);
        setIsGameActive(true);
        setIsCashedOut(false);
        setMessage('Game in progress...');
    };

    const handleCashOut = () => {
        if (!isGameActive || isCashedOut) return;

        const winnings = Math.floor(betAmount * currentMultiplier);
        // CREDIT WINNINGS & LOG
        updateWallet(winnings, 'Crash Win', { isHistory: true, win: true, multiplier: currentMultiplier.toFixed(2) });

        setIsCashedOut(true);
        setIsGameActive(false);
        setMessage(`CASHOUT! x${currentMultiplier.toFixed(2)}. Winnings: ${winnings} credits.`);
        setTimeout(() => setIsBetting(true), 3000);
    };

    useEffect(() => {
        let intervalId;
        if (isGameActive && !isCashedOut) {
            intervalId = setInterval(() => {
                setCurrentMultiplier(prev => {
                    let next = prev + 0.01 + Math.max(0.001, Math.log(prev) / 50);
                    next = Math.floor(next * 100) / 100;

                    if (next >= crashPoint) {
                        clearInterval(intervalId);
                        setIsGameActive(false);
                        // LOG LOSS
                        updateWallet(0, 'Crash Loss', { isHistory: true, win: false, multiplier: crashPoint.toFixed(2) });
                        setMessage(`CRASHED at x${crashPoint.toFixed(2)}! Loss.`);
                        setTimeout(() => setIsBetting(true), 3000);
                        return crashPoint;
                    }
                    return next;
                });
            }, gameSpeed);
        }
        return () => clearInterval(intervalId);
    }, [isGameActive, isCashedOut, crashPoint, betAmount, updateWallet]);

    // Betting phase timer simulation
    useEffect(() => {
        if (isBetting && !isGameActive) {
            setMessage('Next round starting in 5...');
            const timer = setTimeout(startRound, 5000);
            return () => clearTimeout(timer);
        }
    }, [isBetting, isGameActive, walletData.balance]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <GameCard title="Crash Game" disabled={walletData.balance <= 0}>
            <div className="flex justify-between items-center mb-4 text-sm text-gray-400">
                <span>Last 5 Crashes:</span>
                <div className="flex space-x-1">
                    {walletData.roundHistory?.slice(0, 5).map((r, i) => (
                        <span key={i} className={`px-2 py-1 text-xs font-semibold rounded-full ${r.win ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                            {r.multiplier}×
                        </span>
                    ))}
                </div>
            </div>

            <div className="h-48 flex flex-col items-center justify-center bg-gray-900 rounded-xl mb-6 p-4">
                <p className="text-lg text-indigo-400 font-mono">Current Multiplier</p>
                <h3 className={`text-6xl font-extrabold transition-colors duration-100 ${isGameActive ? 'text-green-400 animate-pulse' : 'text-gray-500'}`}>
                    {currentMultiplier.toFixed(2)}×
                </h3>
                <p className={`mt-2 font-medium text-sm ${isGameActive ? 'text-indigo-400' : 'text-gray-500'}`}>{message}</p>
            </div>

            <Input label="Bet Amount" type="number" value={betAmount} onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)} max={walletData.balance} disabled={!isBetting && isGameActive} />

            <div className="grid grid-cols-2 gap-4 mt-4">
                <Button onClick={startRound} disabled={!isBetting || betAmount <= 0 || betAmount > walletData.balance} className="bg-indigo-600 hover:bg-indigo-700">
                    Place Bet
                </Button>
                <Button onClick={handleCashOut} disabled={!isGameActive || isCashedOut} className="bg-green-600 hover:bg-green-700">
                    Cash Out @ {currentMultiplier.toFixed(2)}×
                </Button>
            </div>
            <p className="text-sm text-center text-gray-500 mt-3">Balance: {walletData.balance.toFixed(2)} credits</p>
        </GameCard>
    );
};

// DiceGame and SlotMachine would follow a similar structure to CrashGameMock, using GameCard and updateWallet.
// Skipping the full code for them to save space, but the principle is the same: use updateWallet for logging.


// --- USER DASHBOARD ---

const UserDashboard = ({ walletData, handleLogout }) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Wallet Balance" className="md:col-span-2">
                    <div className="flex items-center justify-between">
                        <Coins className="w-10 h-10 text-indigo-400" />
                        <span className="text-6xl font-extrabold text-white">{walletData.balance.toFixed(2)}</span>
                        <span className="text-2xl font-bold text-indigo-400">CREDITS</span>
                    </div>
                </Card>
                <Card title="Account Info" className="md:col-span-1">
                    <div className="space-y-3 text-sm text-gray-300">
                        <p><strong>Email:</strong> {walletData.email || 'N/A'}</p>
                        <p><strong>Status:</strong> <span className={`font-bold ${walletData.isBanned ? 'text-red-500' : 'text-green-500'}`}>{walletData.isBanned ? 'BANNED' : 'Active'}</span></p>
                        <p><strong>Joined:</strong> {new Date(walletData.createdAt).toLocaleDateString()}</p>
                        <Button onClick={handleLogout} className="mt-4 bg-red-600 hover:bg-red-700">
                            <LogOut className="w-4 h-4 mr-2 inline" /> Sign Out
                        </Button>
                    </div>
                </Card>
            </div>

            <Card title="Game Activity (Last 10 Rounds)">
                {walletData.roundHistory?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {walletData.roundHistory.slice(0, 10).map((r, i) => (
                            <div key={i} className={`p-3 rounded-lg text-center font-bold ${r.win ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                <p className="text-xl">{r.multiplier}×</p>
                                <p className="text-xs">{r.win ? 'Win' : 'Loss'}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4">No recent game history.</p>
                )}
            </Card>
        </div>
    );
};


// --- ADMIN PANEL COMPONENTS ---

const AdminUserManagement = ({ db, appId }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // This query relies on all user profiles being stored under /artifacts/{appId}/users/{userId}/profile/data
            // We need to query across all user profile subcollections.
            // WARNING: A true production app would need a separate root-level user collection for efficient querying.
            // For this environment, we query the 'public' collection if it were used, but here we simulate a direct query:

            const q = collection(db, 'artifacts', appId, 'users');
            const userDocs = await getDocs(q);
            const userList = [];

            for (const userDoc of userDocs.docs) {
                const profileRef = doc(userDoc.ref, 'profile', 'data');
                const profileSnap = await getDocs(collection(userDoc.ref, 'profile'));
                
                if (profileSnap.docs[0]?.exists) {
                    userList.push({ id: userDoc.id, ...profileSnap.docs[0].data() });
                }
            }
            setUsers(userList.filter(u => (u.email || '').toLowerCase() !== ADMIN_EMAIL)); // Exclude admin safely
        } catch (e) {
            console.error("Error fetching users:", e);
            setError("Failed to load user list. Check Firestore security rules/path.");
        } finally {
            setLoading(false);
        }
    }, [db, appId]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const toggleBan = async (user) => {
        const userRef = doc(db, 'artifacts', appId, 'users', user.id, 'profile', 'data');
        try {
            await updateDoc(userRef, { isBanned: !user.isBanned });
            fetchUsers(); // Refresh list
        } catch (e) {
            setError(`Failed to update user status: ${e.message}`);
        }
    };

    if (loading) return <p className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400" /></p>;
    if (error) return <p className="text-red-500 p-4 bg-red-900/30 rounded-lg">{error}</p>;

    return (
        <Card title="User Management">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                        <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Balance</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {users.map(user => (
                            <tr key={user.id} className="text-sm text-white hover:bg-gray-700">
                                <td className="px-6 py-4 whitespace-nowrap">{user.email || user.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{user.balance.toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isBanned ? 'bg-red-800 text-red-300' : 'bg-green-800 text-green-300'}`}>
                                        {user.isBanned ? 'Banned' : 'Active'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Button onClick={() => toggleBan(user)} className={`w-auto px-3 py-1 text-xs ${user.isBanned ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                        {user.isBanned ? 'Unban' : 'Ban User'}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const AdminTransactionApproval = ({ db, appId }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const q = collection(db, 'artifacts', appId, 'public', 'transactions');

    // Use onSnapshot for real-time updates on pending requests
    useEffect(() => {
        const unsubscribe = onSnapshot(query(q, where('status', '==', 'Pending')), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort to show deposits first
            list.sort((a, b) => a.type === 'Deposit' ? -1 : 1);
            setRequests(list);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching transactions:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, appId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleApproval = async (request, newStatus) => {
        const requestRef = doc(q, request.id);
        const userProfileRef = doc(db, 'artifacts', appId, 'users', request.userId, 'profile', 'data');
        const amountChange = request.type === 'Deposit' ? request.amount : -request.amount;

        try {
            await runTransaction(db, async (transaction) => {
                const profileSnap = await transaction.get(userProfileRef);
                if (!profileSnap.exists()) throw new Error("User profile not found.");
                
                const currentBalance = profileSnap.data().balance;
                let newBalance = currentBalance;

                // 1. Update User Balance (Only for 'Approved')
                if (newStatus === 'Approved') {
                    if (request.type === 'Withdraw' && currentBalance < request.amount) {
                         throw new Error("Withdrawal amount exceeds user balance. Cannot approve.");
                    }
                    newBalance = parseFloat((currentBalance + amountChange).toFixed(2));
                    transaction.update(userProfileRef, { balance: newBalance });
                }

                // 2. Update Transaction Status
                transaction.update(requestRef, {
                    status: newStatus,
                    processedBy: 'admin',
                    processedAt: serverTimestamp(),
                });
            });
        } catch (e) {
            console.error(`Transaction processing failed: ${e.message}`);
            // Use console.log instead of alert here as per instructions
            console.log(`Admin Approval Error: ${e.message}`); 
        }
    };

    if (loading) return <p className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400" /></p>;

    return (
        <Card title="Pending Transaction Approvals">
            <div className="text-gray-400 mb-4">{requests.length} pending requests.</div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                        <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Network</th>
                            <th className="px-6 py-3">Tx Hash</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {requests.map(req => (
                            <tr key={req.id} className={`text-sm text-white ${req.type === 'Deposit' ? 'bg-gray-800' : 'bg-gray-900'}`}>
                                <td className={`px-6 py-4 whitespace-nowrap font-bold ${req.type === 'Deposit' ? 'text-green-400' : 'text-red-400'}`}>{req.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs">{req.userEmail}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{req.amount.toFixed(2)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{req.network}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <code className="text-xs break-all cursor-pointer hover:text-indigo-400" onClick={() => navigator.clipboard.writeText(req.txHash || req.address)}>
                                        {req.txHash ? req.txHash.substring(0, 10) + '...' : 'User Addr'} <Eye className="w-3 h-3 inline ml-1" />
                                    </code>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap space-x-2">
                                    <Button onClick={() => handleApproval(req, 'Approved')} className="w-auto px-3 py-1 text-xs bg-green-600 hover:bg-green-700">
                                        <Check className="w-3 h-3 inline mr-1" /> Approve
                                    </Button>
                                    <Button onClick={() => handleApproval(req, 'Rejected')} className="w-auto px-3 py-1 text-xs bg-red-600 hover:bg-red-700">
                                        <X className="w-3 h-3 inline mr-1" /> Reject
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const AdminGameActivity = ({ db, appId }) => {
    const [bets, setBets] = useState([]);
    const [loading, setLoading] = useState(true);

    const q = collection(db, 'artifacts', appId, 'public', 'bets');

    useEffect(() => {
        const unsubscribe = onSnapshot(query(q, orderBy('timestamp', 'desc')), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBets(list);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching bets:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db, appId]);

    const totalBets = bets.length;
    const totalWinnings = bets.filter(b => b.type.includes('Win')).reduce((sum, b) => sum + b.amount, 0);
    const totalLosses = bets.filter(b => b.type.includes('Bet')).reduce((sum, b) => sum + b.amount, 0);
    const winRatio = totalBets > 0 ? (bets.filter(b => b.type.includes('Win')).length / totalBets * 100).toFixed(2) : 0;
    const houseEdge = totalLosses > 0 ? ((totalLosses - totalWinnings) / totalLosses * 100).toFixed(2) : 0;

    if (loading) return <p className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400" /></p>;

    return (
        <Card title="Game & Financial Overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                <div className="p-4 bg-gray-700 rounded-lg"><p className="text-xl font-bold text-green-400">{totalBets}</p><p className="text-xs text-gray-400">Total Bets</p></div>
                <div className="p-4 bg-gray-700 rounded-lg"><p className="text-xl font-bold text-indigo-400">{totalWinnings.toFixed(2)}</p><p className="text-xs text-gray-400">Total Winnings</p></div>
                <div className="p-4 bg-gray-700 rounded-lg"><p className="text-xl font-bold text-red-400">{houseEdge}%</p><p className="text-xs text-gray-400">House Edge</p></div>
                <div className="p-4 bg-gray-700 rounded-lg"><p className="text-xl font-bold text-yellow-400">{winRatio}%</p><p className="text-xs text-gray-400">Avg Win Ratio</p></div>
            </div>

            <h3 className="text-lg font-bold text-indigo-400 mb-3">Recent Game Activity</h3>
            <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                        <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Amount/Payout</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-sm">
                        {bets.slice(0, 50).map(bet => (
                            <tr key={bet.id} className="hover:bg-gray-700">
                                <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-500">
                                    {bet.timestamp ? new Date(bet.timestamp.seconds * 1000).toLocaleTimeString() : '...'}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-gray-300 text-xs">{bet.userEmail.substring(0, 15)}...</td>
                                <td className={`px-6 py-3 whitespace-nowrap ${bet.type.includes('Win') ? 'text-green-400' : 'text-yellow-400'}`}>{bet.type}</td>
                                <td className="px-6 py-3 whitespace-nowrap">{bet.amount.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const AdminPanel = ({ db, appId }) => {
    const [activeAdminTab, setActiveAdminTab] = useState('Transactions');

    return (
        <div className="p-6">
            <h1 className="text-4xl font-extrabold text-indigo-400 mb-8 border-b border-gray-700 pb-4">Admin Control Panel</h1>
            <div className="flex space-x-4 mb-8">
                <button onClick={() => setActiveAdminTab('Transactions')} className={`py-2 px-4 rounded-lg font-semibold ${activeAdminTab === 'Transactions' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                    <DollarSign className="w-4 h-4 inline mr-2" /> Transactions
                </button>
                <button onClick={() => setActiveAdminTab('Users')} className={`py-2 px-4 rounded-lg font-semibold ${activeAdminTab === 'Users' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                    <Users className="w-4 h-4 inline mr-2" /> Users
                </button>
                <button onClick={() => setActiveAdminTab('Activity')} className={`py-2 px-4 rounded-lg font-semibold ${activeAdminTab === 'Activity' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                    <Eye className="w-4 h-4 inline mr-2" /> Game Activity
                </button>
            </div>

            {activeAdminTab === 'Transactions' && <AdminTransactionApproval db={db} appId={appId} />}
            {activeAdminTab === 'Users' && <AdminUserManagement db={db} appId={appId} />}
            {activeAdminTab === 'Activity' && <AdminGameActivity db={db} appId={appId} />}
        </div>
    );
};

// --- MAIN APPLICATION ---

const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null); // Firebase User object
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [userRole, setUserRole] = useState('guest'); // 'guest', 'user', 'admin'

  const [walletData, setWalletData] = useState({
      balance: 0.00,
      email: '',
      isBanned: false,
      roundHistory: [],
      createdAt: Date.now(),
  });

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  // --- FIRESTORE UTILITIES ---
  const getUserProfileRef = useCallback((currentUserId) => {
    if (!db || !currentUserId) return null;
    // Private data path: /artifacts/{appId}/users/{userId}/profile/data
    return doc(db, 'artifacts', appId, 'users', currentUserId, 'profile', 'data');
  }, [db, appId]);

  const getPublicBetsCollection = useCallback(() => {
    if (!db) return null;
    // Public collection path: /artifacts/{appId}/public/games/bets
    return collection(db, 'artifacts', appId, 'public', 'bets');
  }, [db, appId]);


  const updateWallet = useCallback(async (amount, type, historyData = null) => {
    if (!db || !userId) { console.error("Firestore or User ID not ready."); return; }

    const profileRef = getUserProfileRef(userId);

    try {
        await runTransaction(db, async (transaction) => {
            const profileSnap = await transaction.get(profileRef);
            if (!profileSnap.exists()) throw new Error("Profile not found.");

            const currentBalance = profileSnap.data().balance;
            const newBalance = parseFloat((currentBalance + amount).toFixed(2));
            const currentHistory = profileSnap.data().roundHistory || [];

            // 1. Update Profile (Balance and History)
            const updatePayload = { balance: newBalance };
            
            if (historyData) {
                updatePayload.roundHistory = [{ ...historyData, date: serverTimestamp() }, ...currentHistory].slice(0, 50);
            }
            transaction.update(profileRef, updatePayload);

            // 2. Log Bet to Public Collection (Admin Viewable)
            const betsCollection = getPublicBetsCollection();
            transaction.set(doc(betsCollection), {
                userId,
                userEmail: walletData.email,
                type,
                amount: amount,
                timestamp: serverTimestamp(),
                multiplier: historyData?.multiplier || null
            });
        });

        // Optimistically update local state for fast UI feedback
        setWalletData(prev => ({
            ...prev,
            balance: parseFloat((prev.balance + amount).toFixed(2)),
            roundHistory: historyData 
                ? [{ ...historyData, date: Date.now() }, ...(prev.roundHistory || [])].slice(0, 50)
                : prev.roundHistory
        }));

    } catch (error) {
        console.error("Error running transaction for game action:", error);
    }
  }, [db, userId, getUserProfileRef, getPublicBetsCollection, walletData.email]);


  // --- FIREBASE INITIALIZATION & AUTH LISTENER ---
  useEffect(() => {
    try {
        // FIX for auth/custom-token-mismatch: Use environment config if available
        const config = typeof __firebase_config !== 'undefined'
            ? JSON.parse(__firebase_config)
            : firebaseConfig;

        const app = initializeApp(config);
        const firestore = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDb(firestore);
        setAuth(firebaseAuth);

        // Handle custom auth token if provided by the environment (for initial setup)
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) {
            signInWithCustomToken(firebaseAuth, token).catch(e => console.error("Custom token sign-in failed:", e));
        }

        onAuthStateChanged(firebaseAuth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setUserId(currentUser.uid);
                // FIX: Safely check for email before calling toLowerCase()
                const userEmail = currentUser.email ? currentUser.email.toLowerCase() : '';
                setUserRole(userEmail === ADMIN_EMAIL ? 'admin' : 'user');
            } else {
                setUser(null);
                setUserId(null);
                setUserRole('guest');
            }
            setIsLoading(false);
        });

    } catch (error) {
        console.error("Firebase Initialization Error:", error);
        setIsLoading(false);
    }
  }, []);

  // --- USER PROFILE & DATA LISTENER ---
  useEffect(() => {
    if (!userId || !db) return;

    const profileRef = getUserProfileRef(userId);

    const unsubscribe = onSnapshot(profileRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setWalletData(data);
        } else {
            // New user, create profile
            const initialData = {
                email: user.email || userId, // Use userId as a fallback if email is null
                balance: 0.00,
                isBanned: false,
                roundHistory: [],
                createdAt: Date.now(),
            };
            await setDoc(profileRef, initialData);
            setWalletData(initialData);
        }
    }, (error) => {
        console.error("Error fetching user profile:", error);
    });

    return () => unsubscribe();
  }, [userId, db, user, getUserProfileRef]);


  // --- AUTH Handlers ---
  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
        setActiveTab('Dashboard');
    }
  };

  const handleLogin = () => {
    // Auth state change handler takes over.
    setActiveTab('Dashboard');
  };

  // --- Render Functions ---

  const renderTabContent = () => {
    if (!user) {
        return <AuthForm auth={auth} onLogin={handleLogin} setIsLoading={setIsLoading} />;
    }
    
    if (userRole === 'admin') {
        return <AdminPanel db={db} appId={appId} />;
    }
    
    // Regular User Portal
    if (walletData.isBanned) {
        return (
            <div className="text-center p-20 bg-red-900/30 rounded-xl">
                <Ban className="w-16 h-16 mx-auto text-red-500 mb-4" />
                <h2 className="text-3xl font-bold text-red-500">ACCOUNT BANNED</h2>
                <p className="text-xl text-gray-300 mt-2">Access to the game portal has been revoked by the administrator.</p>
                <button onClick={handleLogout} className="mt-8 text-indigo-400 hover:text-indigo-300">Sign Out</button>
            </div>
        );
    }

    const walletProps = { walletData, updateWallet, db, userId, handleLogout };
    const isZeroBalance = walletData.balance <= 0;

    switch (activeTab) {
      case 'Dashboard':
        return <UserDashboard {...walletProps} />;
      case 'DepositWithdraw':
        return <DepositWithdraw {...walletProps} />;
      case 'Dice':
        // Using a placeholder for other games to save complexity space
        return <GameCard title="Dice Game" disabled={isZeroBalance}><p className="py-20 text-center text-gray-500">Dice Game Logic Here (Uses updateWallet for bets).</p></GameCard>;
      case 'Slots':
        return <GameCard title="Slots Game" disabled={isZeroBalance}><p className="py-20 text-center text-gray-500">Slots Game Logic Here (Uses updateWallet for bets).</p></GameCard>;
      case 'Crash':
        return <CrashGameMock {...walletProps} />;
      default:
        return <UserDashboard {...walletProps} />;
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, tab: 'Dashboard' },
    { name: 'Deposit / Withdraw', icon: DollarSign, tab: 'DepositWithdraw' },
    { name: 'Dice', icon: Dice5, tab: 'Dice', disabled: walletData.balance <= 0 },
    { name: 'Slots', icon: GripVertical, tab: 'Slots', disabled: walletData.balance <= 0 },
    { name: 'Crash', icon: Rocket, tab: 'Crash', disabled: walletData.balance <= 0 },
  ];

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 transition-colors duration-300">
            <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                <p className="text-lg font-medium text-gray-300">Loading secure casino session...</p>
            </div>
        </div>
    );
  }

  // Gated Access to Auth Form if user is null
  if (!user) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
             <div className="w-full">
                <h1 className="text-4xl font-extrabold text-center text-indigo-400 mb-12">Login to Casino Portal</h1>
                {renderTabContent()}
             </div>
        </div>
    );
  }
  
  // Admin Panel renders full width, no sidebar
  if (userRole === 'admin') {
      return (
        <div className="min-h-screen bg-gray-900 text-white">
            <AdminPanel db={db} appId={appId} />
            <div className="fixed bottom-4 right-4 z-50">
                <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 w-auto px-4 py-2">
                    <LogOut className="w-4 h-4 mr-2 inline" /> Admin Sign Out
                </Button>
            </div>
        </div>
      );
  }

  // Regular User App Layout
  return (
    <div className="min-h-screen flex bg-gray-900 text-white transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-6 shadow-xl flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold text-indigo-400 mb-8">Casino Hub</h1>
          <p className="text-xs text-gray-500 mb-4 break-all">
             {walletData.email}
          </p>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.tab)}
                disabled={item.disabled}
                className={`flex items-center w-full px-4 py-3 rounded-xl font-medium transition-colors duration-200 ${
                  activeTab === item.tab
                    ? 'bg-indigo-700 text-indigo-300'
                    : 'text-gray-400 hover:bg-gray-700'
                } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
                {item.disabled && <span className="ml-auto text-red-500 text-xs">(0 Balance)</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings/Logout */}
        <div className="space-y-2">
            <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-gray-700 transition-colors duration-200"
            >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
        <header className="flex justify-between items-center pb-6 border-b border-gray-700 mb-8">
          <h1 className="text-3xl font-extrabold text-white">{activeTab}</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 p-3 bg-indigo-600 rounded-xl text-white shadow-lg">
              <Coins className="w-6 h-6" />
              <span className="text-xl font-bold">{walletData.balance.toFixed(2)}</span>
              <span className="text-sm font-medium">CREDITS</span>
            </div>
            <div className="flex items-center space-x-2 p-2 bg-gray-700 rounded-full">
              <User className="w-6 h-6 text-indigo-400" />
              <span className="font-semibold hidden sm:block">{walletData.email}</span>
            </div>
          </div>
        </header>
        
        {/* Zero-Balance Prompt */}
        {walletData.balance <= 0 && activeTab !== 'DepositWithdraw' && (
            <div className="mb-6 p-4 bg-yellow-900/50 border border-yellow-600 rounded-xl flex items-center justify-between shadow-md">
                <div className="flex items-center">
                    <Wallet className="w-6 h-6 text-yellow-400 mr-3" />
                    <p className="text-yellow-400 font-medium">
                        Your balance is **0.00 Credits**. Deposit funds to unlock games!
                    </p>
                </div>
                <button 
                    onClick={() => setActiveTab('DepositWithdraw')}
                    className="ml-4 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    Go to Deposit
                </button>
            </div>
        )}

        {/* Tab Content */}
        {renderTabContent()}
      </main>
    </div>
  );
};

export default App;
