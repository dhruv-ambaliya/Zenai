import React, { useState, useEffect } from 'react';
import './PriceCalculator.css';

const PriceCalculator = ({ onClose }) => {
    const [weeks, setWeeks] = useState(1);
    const [numDisplays, setNumDisplays] = useState(1);
    const [duration, setDuration] = useState('5s'); // 5s or 10s
    const [calculatedPrice, setCalculatedPrice] = useState(0);

    const BASE_RATE = 5000;

    useEffect(() => {
        const multiplier = duration === '10s' ? 1.5 : 1;
        const price = BASE_RATE * weeks * numDisplays * multiplier;
        setCalculatedPrice(price);
    }, [weeks, numDisplays, duration]);

    return (
        <div className="price-calculator">
            <div className="calculator-header">
                <h3>Estimate Campaign Cost</h3>
                <p>Calculate optimal pricing for your ad campaigns.</p>
            </div>

            <div className="calc-form">
                <div className="form-group">
                    <label>Weeks</label>
                    <input
                        type="number"
                        min="1"
                        value={weeks}
                        onChange={(e) => setWeeks(parseInt(e.target.value) || 1)}
                    />
                </div>

                <div className="form-group">
                    <label>Number of Displays</label>
                    <input
                        type="number"
                        min="1"
                        value={numDisplays}
                        onChange={(e) => setNumDisplays(parseInt(e.target.value) || 1)}
                    />
                </div>

                <div className="form-group">
                    <label>Ad Duration</label>
                    <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                    >
                        <option value="5s">5 seconds</option>
                        <option value="10s">10 seconds</option>
                    </select>
                </div>
            </div>

            <div className="calc-result">
                <div className="result-row">
                    <span>Base Rate:</span>
                    <span>₹ {BASE_RATE.toLocaleString()}</span>
                </div>
                <div className="result-row">
                    <span>Multiplier:</span>
                    <span>{duration === '10s' ? '1.5x' : '1x'}</span>
                </div>
                <div className="total-row">
                    <span>Total Campaign Cost:</span>
                    <span className="total-price">₹ {calculatedPrice.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default PriceCalculator;
