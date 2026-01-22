export default function Form(props) {
        const [date, setDate] = useState(new Date());
        const [amount, setAmount] = useState(0);
        const [vat, setVat] = useState(0);
        const [exVat, setExVat] = useState(0);
        const [currency, setCurrency] = useState();
        const [category, setCategory] = useState();
        const [supplier, setSupplier] = useState();
        const [comment, setComment] = useState();
    
        return (
            <form>
                <div class="row w-100 d-flex">
                    <div class="col-12">
                        <span>
                            <label for="date">Date</label>
                            <input type="date" name="date" id="date" value={date}/>
                        </span>
                        <span>
                            <label for="amount">Amount</label>
                            <input type="number" name="amount" id="amount" value={amount}/>
                        </span>
                        <span>
                            <label for="vat">VAT</label>
                            <input type="vat" name="vat" id="vat" value={vat}/>
                        </span>
                        <span>
                            <label for="exVat">ex VAT</label>
                            <input type="number" name="exVat" id="exVat" value={exVat}/>
                        </span>
                    </div>
                </div>
                <div class="row w-100 d-flex">
                    <div class="col-12">
                        <span>
                            <label for="currency">Currency</label>
                            <select id="currency" name="currency" value={currency}>
                                <option value="" selected></option>
                            </select>
                        </span>
                        <span>
                            <label for="category">Currency</label>
                            <select id="category" name="category" value={currency}>
                                <option value="" selected></option>
                            </select>
                        </span>                        
                        <span>
                            <label for="supplier">Supplier</label>
                            <input type="text" id="supplier" name="supplier" value={supplier}/>
                        </span>
                    </div>
                </div>
                <div class="row w-100 d-flex">
                    <div class="col-12">
                        <label for="comment">Supplier</label>
                        <input type="text" id="comment" name="comment" value={comment}/>
                    </div>
                </div>
                <div class="row w-100 d-flex">
                    <div class="col-12">
                        <button type="submit" class="btn btn-outline-primary">Submit</button>
                    </div>
                </div>

            </form> )
    }